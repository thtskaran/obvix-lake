interface ChatWindowProps {
  className?: string;
}

export const ChatWindow = ({ className }: ChatWindowProps) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Chat Window</h3>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-center h-64 text-gray-500">
          {/* TODO: Implement chat interface with messages, input, etc. */}
          <p>Chat interface placeholder</p>
        </div>
      </div>
    </div>
  );
};