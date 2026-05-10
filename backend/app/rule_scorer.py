class RuleScorer:
    RULES = {
        "urgency": {
            "weight": 10,
            "phrases": [
                "immediately",
                "right now",
                "urgent",
                "act now",
                "limited time",
            ],
        },
        "threat": {
            "weight": 20,
            "phrases": [
                "arrest",
                "warrant",
                "lawsuit",
                "legal action",
                "police will come",
                "criminal charges",
            ],
        },
        "government_impersonation": {
            "weight": 20,
            "phrases": [
                "IRS",
                "social security",
                "FBI",
                "federal agent",
                "customs",
                "immigration officer",
            ],
        },
        "payment_demand": {
            "weight": 25,
            "phrases": [
                "gift card",
                "apple card",
                "google play card",
                "wire transfer",
                "bitcoin",
                "crypto",
                "cash app",
                "zelle",
            ],
        },
        "secrecy_or_pressure": {
            "weight": 15,
            "phrases": [
                "do not tell anyone",
                "keep this confidential",
                "stay on the line",
                "do not hang up",
            ],
        },
        "account_suspension": {
            "weight": 15,
            "phrases": [
                "account suspended",
                "social security number suspended",
                "bank account frozen",
                "card blocked",
            ],
        },
        "verification_code_theft": {
            "weight": 25,
            "phrases": [
                "verification code",
                "one time password",
                "OTP",
                "security code",
                "read me the code",
            ],
        },
        "remote_access": {
            "weight": 25,
            "phrases": [
                "install anydesk",
                "install teamviewer",
                "remote access",
                "download this app",
            ],
        },
    }


    def score_text(self, text: str) -> dict:
        normalized_text = text.casefold()
        matched_categories: list[str] = []
        flagged_phrases: list[str] = []
        seen_phrases: set[str] = set()
        score_delta = 0

        for category, rule in self.RULES.items():
            category_matched = False

            for phrase in rule["phrases"]:
                phrase_key = phrase.casefold()
                if phrase_key in normalized_text and phrase_key not in seen_phrases:
                    seen_phrases.add(phrase_key)
                    flagged_phrases.append(phrase)
                    category_matched = True

            if category_matched:
                matched_categories.append(category)
                score_delta += rule["weight"]

        return {
            "score_delta": min(score_delta, 50),
            "matched_categories": matched_categories,
            "flagged_phrases": flagged_phrases,
        }
