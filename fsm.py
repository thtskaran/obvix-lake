"""
FSM removed: this module is a no-op stub kept for compatibility only.
The application has been refactored to a KB-driven multi-persona flow and no
longer uses a finite-state machine. Importing this module will raise in case
code still depends on it so broken references are detected early.
"""

def initialize_fsm_for_user(*args, **kwargs):
    raise RuntimeError("FSM removed: application no longer supports per-turn FSMs")
