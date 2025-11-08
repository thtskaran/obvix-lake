"""Advanced document parsing and conversion using Docling.

This service converts documents from Google Drive (PDF, DOCX, etc.) into structured
Docling documents, preserving formatting, tables, images, and semantic structure.
It then performs intelligent chunking that respects document hierarchy.
"""
from __future__ import annotations

import io
import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

logger = logging.getLogger(__name__)


@dataclass
class DocumentChunk:
    """Represents a semantically meaningful chunk of a document."""
    
    content: str
    chunk_type: str  # "section", "table", "paragraph", "list", etc.
    metadata: Dict[str, Any]
    heading_hierarchy: List[str]  # List of parent headings
    position: int  # Position in document
    

class DoclingConverter:
    """Converts documents to Docling format with intelligent chunking."""
    
    def __init__(
        self,
        max_chunk_tokens: int = 512,
        preserve_tables: bool = True,
        preserve_formatting: bool = True,
    ):
        """Initialize the Docling converter.
        
        Args:
            max_chunk_tokens: Maximum tokens per chunk (approximate)
            preserve_tables: Whether to keep tables intact as single chunks
            preserve_formatting: Whether to preserve formatting metadata
        """
        self.max_chunk_tokens = max_chunk_tokens
        self.preserve_tables = preserve_tables
        self.preserve_formatting = preserve_formatting
        
        # Configure Docling pipeline for high-quality extraction
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True  # Enable OCR for scanned PDFs
        pipeline_options.do_table_structure = True  # Extract table structure
        
        self.converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options,
                    backend=PyPdfiumDocumentBackend,
                )
            }
        )
        
    def convert_bytes_to_docling(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str,
    ) -> Optional[Any]:
        """Convert raw file bytes to a Docling document.
        
        Args:
            file_bytes: Raw bytes of the document
            mime_type: MIME type of the document
            filename: Original filename (used for format detection)
            
        Returns:
            Docling document object or None if conversion fails
        """
        if not file_bytes:
            logger.warning("Empty file bytes provided for %s", filename)
            return None
            
        # Docling works best with files, so we'll use a temporary file
        try:
            with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp_file:
                tmp_file.write(file_bytes)
                tmp_path = tmp_file.name
            
            # Convert the document
            result = self.converter.convert(tmp_path)
            
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
            
            return result.document
            
        except Exception as exc:
            logger.error("Failed to convert %s with Docling: %s", filename, exc)
            # Clean up temp file on error
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass
            return None
    
    def extract_text_from_docling(self, docling_doc: Any) -> str:
        """Extract plain text from a Docling document.
        
        Args:
            docling_doc: Docling document object
            
        Returns:
            Extracted text content
        """
        if not docling_doc:
            logger.warning("extract_text_from_docling received None/empty document")
            return ""
        
        logger.debug("Extracting text from Docling document (type: %s)", type(docling_doc).__name__)
        logger.debug("Available methods: export_to_markdown=%s, export_to_text=%s", 
                    hasattr(docling_doc, 'export_to_markdown'),
                    hasattr(docling_doc, 'export_to_text'))
            
        try:
            # Docling documents have an export_to_markdown() or export_to_text() method
            if hasattr(docling_doc, 'export_to_markdown'):
                logger.debug("Using export_to_markdown()")
                text = docling_doc.export_to_markdown()
                logger.info("Exported %d chars via export_to_markdown()", len(text) if text else 0)
                return text
            elif hasattr(docling_doc, 'export_to_text'):
                logger.debug("Using export_to_text()")
                text = docling_doc.export_to_text()
                logger.info("Exported %d chars via export_to_text()", len(text) if text else 0)
                return text
            else:
                # Fallback: extract from document structure
                logger.warning("No export method found, converting to string")
                text = str(docling_doc)
                logger.info("Converted to string: %d chars", len(text) if text else 0)
                return text
        except Exception as exc:
            logger.error("Failed to extract text from Docling document: %s", exc, exc_info=True)
            return ""
    
    def chunk_docling_document(
        self,
        docling_doc: Any,
        filename: str,
    ) -> List[DocumentChunk]:
        """Create semantic chunks from a Docling document.
        
        This method respects document structure:
        - Keeps sections together when possible
        - Preserves tables as single chunks
        - Maintains heading hierarchy
        - Splits only at natural boundaries
        
        NOTE: Modern Docling (v2+) uses export APIs instead of page.elements.
        We try structure-based chunking first, but fall back to text-based if needed.
        
        Args:
            docling_doc: Docling document object
            filename: Original filename for metadata
            
        Returns:
            List of DocumentChunk objects
        """
        if not docling_doc:
            logger.warning("Received None/empty docling_doc for %s", filename)
            return []
        
        logger.info("Chunking Docling document %s (type: %s)", filename, type(docling_doc).__name__)
        
        chunks: List[DocumentChunk] = []
        
        try:
            # Modern Docling uses export methods, not page.elements
            # Try structure-based chunking first (for older Docling or custom docs)
            if hasattr(docling_doc, 'body') and hasattr(docling_doc.body, 'elements'):
                logger.info("Document has 'body.elements', using body-based chunking for %s", filename)
                chunks = self._chunk_from_body(docling_doc, filename)
                logger.info("Body-based chunking produced %d chunks for %s", len(chunks), filename)
            elif hasattr(docling_doc, 'pages'):
                logger.info("Document has 'pages' attribute, attempting page-based chunking for %s", filename)
                chunks = self._chunk_from_pages(docling_doc, filename)
                logger.info("Page-based chunking produced %d chunks for %s", len(chunks), filename)
            
            # If no chunks from structure, use text export (standard for Docling v2+)
            if not chunks:
                logger.info("Structure-based chunking returned 0 chunks, using text export method for %s", filename)
                text = self.extract_text_from_docling(docling_doc)
                logger.info("Extracted %d chars of text from %s for text-based chunking", len(text), filename)
                
                if text:
                    chunks = self._chunk_from_text(text, filename)
                    logger.info("Text-based chunking produced %d chunks for %s", len(chunks), filename)
                else:
                    logger.error("No text extracted from %s", filename)
                
        except Exception as exc:
            logger.error("Failed to chunk Docling document %s: %s", filename, exc, exc_info=True)
            # Final fallback
            try:
                text = self.extract_text_from_docling(docling_doc)
                logger.info("Fallback: extracted %d chars for text-based chunking", len(text))
                if text:
                    chunks = self._chunk_from_text(text, filename)
                    logger.info("Fallback text-based chunking produced %d chunks", len(chunks))
                else:
                    logger.error("No text extracted from %s in fallback", filename)
            except Exception as fallback_exc:
                logger.error("Fallback chunking also failed for %s: %s", filename, fallback_exc, exc_info=True)
        
        if not chunks:
            logger.error("CHUNKING FAILED: No chunks produced for %s", filename)
        
        return chunks
    
    def _chunk_from_pages(
        self,
        docling_doc: Any,
        filename: str,
    ) -> List[DocumentChunk]:
        """Chunk a document by analyzing its page structure.
        
        NOTE: Docling's actual structure doesn't use page.elements.
        This method is kept for compatibility but will typically return empty.
        Use text-based chunking instead for Docling documents.
        """
        chunks: List[DocumentChunk] = []
        current_heading_stack: List[str] = []
        chunk_position = 0
        
        logger.debug("Starting page-based chunking for %s", filename)
        
        if not hasattr(docling_doc, 'pages'):
            logger.error("Document missing 'pages' attribute")
            return []
        
        pages = list(docling_doc.pages) if hasattr(docling_doc.pages, '__iter__') else []
        logger.info("Document has %d pages", len(pages))
        
        # Check if pages have elements (older Docling API)
        has_elements = False
        for page_num, page in enumerate(pages, start=1):
            logger.debug("Processing page %d", page_num)
            
            # Process each element on the page
            if hasattr(page, 'elements'):
                has_elements = True
                elements = page.elements
                logger.debug("Page %d has %d elements", page_num, len(list(elements)) if hasattr(elements, '__iter__') else 0)
                
                for elem_idx, element in enumerate(elements):
                    chunk_data = self._process_element(
                        element,
                        current_heading_stack,
                        chunk_position,
                        page_num,
                        filename,
                    )
                    
                    if chunk_data:
                        chunks.append(chunk_data)
                        chunk_position += 1
                        logger.debug("Created chunk %d from page %d element %d", chunk_position, page_num, elem_idx)
        
        if not has_elements:
            logger.info("Docling document uses export API instead of page.elements structure")
        
        logger.info("Page-based chunking complete: %d chunks from %d pages", len(chunks), len(pages))
        return chunks
    
    def _chunk_from_body(
        self,
        docling_doc: Any,
        filename: str,
    ) -> List[DocumentChunk]:
        """Chunk a document from its body structure."""
        chunks: List[DocumentChunk] = []
        current_heading_stack: List[str] = []
        chunk_position = 0
        
        logger.debug("Starting body-based chunking for %s", filename)
        
        if not hasattr(docling_doc, 'body'):
            logger.error("Document missing 'body' attribute")
            return []
        
        body = docling_doc.body
        logger.debug("Body type: %s, has elements: %s", type(body).__name__, hasattr(body, 'elements'))
        
        if hasattr(body, 'elements'):
            elements = body.elements
            logger.info("Body has %d elements", len(elements) if hasattr(elements, '__len__') else 0)
            
            for elem_idx, element in enumerate(elements):
                chunk_data = self._process_element(
                    element,
                    current_heading_stack,
                    chunk_position,
                    0,
                    filename,
                )
                
                if chunk_data:
                    chunks.append(chunk_data)
                    chunk_position += 1
                    logger.debug("Created chunk %d from body element %d", chunk_position, elem_idx)
        else:
            logger.warning("Body has no 'elements' attribute")
        
        logger.info("Body-based chunking complete: %d chunks", len(chunks))
        return chunks
    
    def _process_element(
        self,
        element: Any,
        heading_stack: List[str],
        position: int,
        page_num: int,
        filename: str,
    ) -> Optional[DocumentChunk]:
        """Process a single document element into a chunk."""
        # Determine element type
        element_type = getattr(element, 'type', 'paragraph')
        element_text = getattr(element, 'text', str(element))
        
        logger.debug("Processing element type=%s, text_len=%d", element_type, len(element_text) if element_text else 0)
        
        if not element_text or not element_text.strip():
            logger.debug("Skipping empty element")
            return None
        
        # Handle headings - update the stack
        if 'heading' in element_type.lower() or 'title' in element_type.lower():
            level = self._get_heading_level(element)
            # Trim stack to appropriate level
            heading_stack = heading_stack[:level-1] if level > 0 else []
            heading_stack.append(element_text.strip())
            logger.debug("Updated heading stack (level %d): %s", level, heading_stack)
            # Don't return heading as a separate chunk - it will be in metadata
            return None
        
        # Build metadata
        metadata = {
            'filename': filename,
            'page': page_num,
            'element_type': element_type,
        }
        
        # Add formatting if preserved
        if self.preserve_formatting:
            if hasattr(element, 'style'):
                metadata['style'] = str(element.style)
            if hasattr(element, 'formatting'):
                metadata['formatting'] = str(element.formatting)
        
        # Special handling for tables
        if 'table' in element_type.lower() and self.preserve_tables:
            logger.debug("Processing table element")
            table_text = self._format_table(element)
            return DocumentChunk(
                content=table_text,
                chunk_type='table',
                metadata=metadata,
                heading_hierarchy=heading_stack.copy(),
                position=position,
            )
        
        # Regular paragraph/text
        logger.debug("Creating %s chunk with %d chars", element_type, len(element_text))
        return DocumentChunk(
            content=element_text.strip(),
            chunk_type=element_type,
            metadata=metadata,
            heading_hierarchy=heading_stack.copy(),
            position=position,
        )
    
    def _get_heading_level(self, element: Any) -> int:
        """Extract heading level from an element."""
        element_type = getattr(element, 'type', '')
        
        # Try to parse level from type (e.g., "heading1", "h2")
        if hasattr(element, 'level'):
            return int(element.level)
        
        # Parse from type string
        import re
        match = re.search(r'(\d+)', element_type)
        if match:
            return int(match.group(1))
        
        return 1  # Default to top level
    
    def _format_table(self, table_element: Any) -> str:
        """Format a table element as markdown or plain text."""
        try:
            # Try to get table as markdown
            if hasattr(table_element, 'to_markdown'):
                return table_element.to_markdown()
            
            # Try to get table data structure
            if hasattr(table_element, 'rows'):
                rows = table_element.rows
                lines = []
                for row in rows:
                    if hasattr(row, 'cells'):
                        cell_texts = [str(cell.text) for cell in row.cells if hasattr(cell, 'text')]
                        lines.append(' | '.join(cell_texts))
                return '\n'.join(lines)
            
            # Fallback to text
            return str(table_element.text if hasattr(table_element, 'text') else table_element)
            
        except Exception as exc:
            logger.warning("Failed to format table: %s", exc)
            return str(table_element)
    
    def _chunk_from_text(
        self,
        text: str,
        filename: str,
    ) -> List[DocumentChunk]:
        """Fallback: chunk plain text intelligently."""
        if not text:
            return []
        
        chunks: List[DocumentChunk] = []
        
        # Split on paragraph boundaries
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        current_chunk_lines: List[str] = []
        current_tokens = 0
        chunk_position = 0
        
        for para in paragraphs:
            # Rough token estimate (words * 1.3)
            para_tokens = len(para.split()) * 1.3
            
            # If adding this paragraph would exceed limit and we have content
            if current_tokens + para_tokens > self.max_chunk_tokens and current_chunk_lines:
                # Flush current chunk
                content = '\n\n'.join(current_chunk_lines)
                chunks.append(DocumentChunk(
                    content=content,
                    chunk_type='paragraph',
                    metadata={'filename': filename},
                    heading_hierarchy=[],
                    position=chunk_position,
                ))
                chunk_position += 1
                current_chunk_lines = [para]
                current_tokens = para_tokens
            else:
                current_chunk_lines.append(para)
                current_tokens += para_tokens
        
        # Flush remaining content
        if current_chunk_lines:
            content = '\n\n'.join(current_chunk_lines)
            chunks.append(DocumentChunk(
                content=content,
                chunk_type='paragraph',
                metadata={'filename': filename},
                heading_hierarchy=[],
                position=chunk_position,
            ))
        
        return chunks
    
    def merge_small_chunks(
        self,
        chunks: List[DocumentChunk],
        min_tokens: int = 100,
    ) -> List[DocumentChunk]:
        """Merge chunks that are too small to be useful.
        
        Args:
            chunks: List of chunks to potentially merge
            min_tokens: Minimum token count for a chunk
            
        Returns:
            Merged chunks
        """
        if not chunks:
            return []
        
        merged: List[DocumentChunk] = []
        current_merge: Optional[DocumentChunk] = None
        
        for chunk in chunks:
            token_estimate = len(chunk.content.split()) * 1.3
            
            # If chunk is too small, try to merge with previous
            if token_estimate < min_tokens and current_merge:
                # Merge content
                merged_content = f"{current_merge.content}\n\n{chunk.content}"
                
                # Update metadata
                merged_metadata = dict(current_merge.metadata)
                if chunk.metadata.get('page') != current_merge.metadata.get('page'):
                    merged_metadata['page'] = f"{current_merge.metadata.get('page')}-{chunk.metadata.get('page')}"
                
                current_merge = DocumentChunk(
                    content=merged_content,
                    chunk_type=current_merge.chunk_type,
                    metadata=merged_metadata,
                    heading_hierarchy=current_merge.heading_hierarchy,
                    position=current_merge.position,
                )
            else:
                # Flush current merge if exists
                if current_merge:
                    merged.append(current_merge)
                current_merge = chunk
        
        # Flush final chunk
        if current_merge:
            merged.append(current_merge)
        
        return merged


def create_docling_converter(
    max_chunk_tokens: int = 512,
    preserve_tables: bool = True,
    preserve_formatting: bool = True,
) -> DoclingConverter:
    """Factory function to create a DoclingConverter instance.
    
    Args:
        max_chunk_tokens: Maximum tokens per chunk (approximate)
        preserve_tables: Whether to keep tables intact as single chunks
        preserve_formatting: Whether to preserve formatting metadata
        
    Returns:
        Configured DoclingConverter instance
    """
    return DoclingConverter(
        max_chunk_tokens=max_chunk_tokens,
        preserve_tables=preserve_tables,
        preserve_formatting=preserve_formatting,
    )
