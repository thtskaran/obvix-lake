import logging
from transitions.extensions import LockedMachine as Machine
from transitions.extensions.states import add_state_features, Tags

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@add_state_features(Tags)
class CustomStateMachine(Machine):
    pass


class UserConversationState:
    """Support-focused state container used by the conversational FSM."""

    def __init__(self, user_id, profile_data=None):
        self.user_id = user_id
        profile_data = profile_data or {}
        self.profile = dict(profile_data)
        self.message_count = int(profile_data.get('message_count', 0))
        self.intake_notes_captured = int(profile_data.get('intake_notes_captured', 0))
        self.diagnostics_completed = bool(profile_data.get('diagnostics_completed', False))

    # ---------- Transition guards ----------
    def ready_for_intake(self):
        return self.message_count >= 1 or self.intake_notes_captured >= 1

    def ready_for_diagnostics(self):
        return self.message_count >= 2 or self.intake_notes_captured >= 2

    def ready_for_solution(self):
        return self.message_count >= 3 or self.diagnostics_completed

    def ready_for_confirmation(self):
        return self.message_count >= 4

    def ready_for_closing(self):
        return self.message_count >= 5

    def is_in_final_state(self):
        return hasattr(self, 'state') and self.state in [
            'FinalState_Resolved', 'FinalState_Escalated', 'FinalState_FollowUp'
        ]

    # ---------- State callbacks ----------
    def on_enter_Phase0_Greeting(self):
        logging.info(f"User {self.user_id}: entered Greeting phase.")

    def on_enter_Phase2_Diagnostics(self):
        logging.info(f"User {self.user_id}: diagnostics prompted.")

    def on_enter_FinalState_Escalated(self):
        logging.info(f"User {self.user_id}: case escalated to humans.")

    def on_enter_FinalState_Resolved(self):
        logging.info(f"User {self.user_id}: case marked resolved.")


# ==============================================================================
# FSM DEFINITION
# ==============================================================================
states = [
    'Phase0_Greeting',
    'Phase1_IssueIntake',
    {'name': 'Phase2_Diagnostics', 'on_enter': 'on_enter_Phase2_Diagnostics'},
    'Phase3_SolutionProposal',
    'Phase4_Confirmation',
    'Phase5_Closing',
    {'name': 'FinalState_Resolved', 'on_enter': 'on_enter_FinalState_Resolved', 'tags': ['final_state']},
    {'name': 'FinalState_Escalated', 'on_enter': 'on_enter_FinalState_Escalated', 'tags': ['final_state']},
    {'name': 'FinalState_FollowUp', 'tags': ['final_state']},
]

transitions = [
    {'trigger': 'progress', 'source': 'Phase0_Greeting', 'dest': 'Phase1_IssueIntake', 'conditions': 'ready_for_intake'},
    {'trigger': 'progress', 'source': 'Phase1_IssueIntake', 'dest': 'Phase2_Diagnostics', 'conditions': 'ready_for_diagnostics'},
    {'trigger': 'progress', 'source': 'Phase2_Diagnostics', 'dest': 'Phase3_SolutionProposal', 'conditions': 'ready_for_solution'},
    {'trigger': 'progress', 'source': 'Phase3_SolutionProposal', 'dest': 'Phase4_Confirmation', 'conditions': 'ready_for_confirmation'},
    {'trigger': 'progress', 'source': 'Phase4_Confirmation', 'dest': 'Phase5_Closing', 'conditions': 'ready_for_closing'},
    {'trigger': 'progress', 'source': 'Phase5_Closing', 'dest': 'FinalState_FollowUp'},

    {'trigger': 'need_more_info', 'source': ['Phase2_Diagnostics', 'Phase3_SolutionProposal'], 'dest': 'Phase1_IssueIntake'},
    {'trigger': 'mark_resolved', 'source': ['Phase3_SolutionProposal', 'Phase4_Confirmation', 'Phase5_Closing'], 'dest': 'FinalState_Resolved'},
    {'trigger': 'schedule_followup', 'source': 'Phase5_Closing', 'dest': 'FinalState_FollowUp'},
    {'trigger': 'escalate', 'source': '*', 'dest': 'FinalState_Escalated'},
    {'trigger': 'reset_flow', 'source': '*', 'dest': 'Phase0_Greeting'},
]


def initialize_fsm_for_user(user_profile):
    """Factory function to create a state machine for a given user profile."""

    user_state = UserConversationState(user_profile.get('user_id'), user_profile)
    initial_state = user_profile.get('fsm_state', 'Phase0_Greeting')

    machine = CustomStateMachine(
        model=user_state,
        states=states,
        transitions=transitions,
        initial=initial_state,
        auto_transitions=False,
    )
    return user_state
