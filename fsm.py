import logging
from transitions.extensions import LockedMachine as Machine
from transitions.extensions.states import add_state_features, Tags

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

@add_state_features(Tags)
class CustomStateMachine(Machine):
    pass

PROFILE_KEYS_FOR_PROGRESS = [
    # discovery-critical
    "city", "address_area", "product_interest", "plan_speed", "budget",
    # signals of need
    "needs", "wants", "pain_points", "use_case",
    # timing/contact
    "timeline", "installation_time_preference", "preferred_contact_time"
]

class UserConversationState:
    """
    Holds a user's state, controlled by the FSM, and initialized from MongoDB profile data.
    The FSM transitions consider both message_count (heuristic) and known profile completeness.
    """
    def __init__(self, user_id, profile_data=None):
        self.user_id = user_id
        profile_data = profile_data or {}
        self.profile = dict(profile_data)  # snapshot for condition checks
        self.message_count = profile_data.get('message_count', 0)
        self.cta_objection_count = profile_data.get('cta_objection_count', 0)
        self.cta_just_performed = profile_data.get('cta_just_performed', False)

    # ---------- Helpers ----------
    def _known_fields_count(self):
        return sum(1 for k in PROFILE_KEYS_FOR_PROGRESS if self.profile.get(k))

    def _has_min_discovery(self):
        # Any 1 discovery-critical field pushes us to discovery faster
        return any(self.profile.get(k) for k in ["city", "product_interest", "plan_speed", "budget"])

    def _has_value_inputs(self):
        # Sufficient inputs to present value sooner
        count = self._known_fields_count()
        return count >= 3  # city + speed + budget, or similar mix

    def _ready_for_cta_by_profile(self):
        count = self._known_fields_count()
        return count >= 5  # rich context known, okay to invite CTA (final guard still in app)

    def is_in_final_state(self):
        return hasattr(self, 'state') and self.state in [
            'FinalState_ClosedWon', 'FinalState_ClosedLost', 'FinalState_SupportEscalated', 'FinalState_SupportResolved'
        ]

    # ---------- State Entry Callbacks ----------
    def on_enter_Phase1_RapportBuilding(self):
        logging.info(f"User {self.user_id}: Entered RapportBuilding.")

    def on_enter_Phase4_CTA(self):
        self.cta_just_performed = True
        logging.info(f"User {self.user_id}: Entered CTA phase. cta_just_performed=True")

    def on_enter_Phase5_ObjectionHandling(self):
        self.cta_objection_count += 1
        logging.info(f"User {self.user_id} objected. Objection count: {self.cta_objection_count}.")
        self.re_engage_after_objection()

    def on_enter_Support_Triage(self):
        logging.info(f"User {self.user_id}: Entered Support_Triage.")

    def on_enter_FinalState_SupportEscalated(self):
        logging.info(f"User {self.user_id}: Escalated to human support.")

    def on_enter_FinalState_SupportResolved(self):
        logging.info(f"User {self.user_id}: Support marked resolved.")

    # ---------- Transition Conditions ----------
    def should_transition_to_discovery(self):
        # Faster if we already know some discovery-critical fields
        return self.message_count > 1 or self._has_min_discovery()

    def should_transition_to_value_prop(self):
        # Faster if enough inputs are known
        return self.message_count > 3 or self._has_value_inputs()

    def should_transition_to_cta(self):
        # Heuristic; app can jump directly via go_to_cta after intent gating
        return self.message_count > 6 or self._ready_for_cta_by_profile()

# ==============================================================================
# FSM DEFINITION
# ==============================================================================
states = [
    'Phase1_RapportBuilding',
    'Phase2_NeedsDiscovery',
    'Phase3_ValueProposition',
    {'name': 'Phase4_CTA', 'on_enter': 'on_enter_Phase4_CTA'},
    {'name': 'Phase5_ObjectionHandling', 'on_enter': 'on_enter_Phase5_ObjectionHandling'},

    # Support path
    {'name': 'Support_Triage', 'on_enter': 'on_enter_Support_Triage'},

    # Final states
    {'name': 'FinalState_ClosedWon', 'tags': ['final_state']},
    {'name': 'FinalState_ClosedLost', 'tags': ['final_state']},
    {'name': 'FinalState_SupportEscalated', 'on_enter': 'on_enter_FinalState_SupportEscalated', 'tags': ['final_state']},
    {'name': 'FinalState_SupportResolved', 'on_enter': 'on_enter_FinalState_SupportResolved', 'tags': ['final_state']},
]

transitions = [
    # Sales progression with conditions
    {'trigger': 'progress', 'source': 'Phase1_RapportBuilding', 'dest': 'Phase2_NeedsDiscovery', 'conditions': 'should_transition_to_discovery'},
    {'trigger': 'progress', 'source': 'Phase2_NeedsDiscovery', 'dest': 'Phase3_ValueProposition', 'conditions': 'should_transition_to_value_prop'},
    {'trigger': 'progress', 'source': 'Phase3_ValueProposition', 'dest': 'Phase4_CTA', 'conditions': 'should_transition_to_cta'},

    # CTA responses
    {'trigger': 'cta_accepted', 'source': 'Phase4_CTA', 'dest': 'FinalState_ClosedWon'},
    {'trigger': 'cta_objected', 'source': 'Phase4_CTA', 'dest': 'Phase5_ObjectionHandling'},

    # Objection loop
    {'trigger': 're_engage_after_objection', 'source': 'Phase5_ObjectionHandling', 'dest': 'Phase3_ValueProposition'},

    # Conversation ended without sale
    {'trigger': 'conversation_ended', 'source': '*', 'dest': 'FinalState_ClosedLost'},

    # Flow routing triggers
    {'trigger': 'set_flow_outbound_lead', 'source': '*', 'dest': 'Phase1_RapportBuilding'},
    {'trigger': 'set_flow_outbound_upsell', 'source': '*', 'dest': 'Phase3_ValueProposition'},
    {'trigger': 'set_flow_inbound_support', 'source': '*', 'dest': 'Support_Triage'},
    {'trigger': 'support_escalate', 'source': 'Support_Triage', 'dest': 'FinalState_SupportEscalated'},
    {'trigger': 'support_resolved', 'source': 'Support_Triage', 'dest': 'FinalState_SupportResolved'},

    # Universal jump to CTA when buying-intent is high (guarded in app)
    {'trigger': 'go_to_cta', 'source': '*', 'dest': 'Phase4_CTA'},
]

def initialize_fsm_for_user(user_profile):
    """
    Factory function to create and initialize a state machine for a given user.
    """
    user_state = UserConversationState(user_profile.get('user_id'), user_profile)
    initial_state = user_profile.get('fsm_state', 'Phase1_RapportBuilding')

    machine = CustomStateMachine(
        model=user_state,
        states=states,
        transitions=transitions,
        initial=initial_state,
        auto_transitions=False
    )
    return user_state
