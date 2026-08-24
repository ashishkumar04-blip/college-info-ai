import os

# Path to your college data file
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "college_info.txt")


def load_data() -> str:
    """Load the full college info text file."""
    with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
        return f.read()


def retrieve_context(question: str) -> str:
    """
    Find the most relevant sections from the college data
    based on keywords in the user's question.
    """
    data = load_data()
    sections = data.split("##")  # Split by section headers

    question_lower = question.lower()

    # Score each section by how many question words it contains
    scored = []
    for section in sections:
        if not section.strip():
            continue
        score = sum(
            1 for word in question_lower.split()
            if len(word) > 3 and word in section.lower()
        )
        scored.append((score, section.strip()))

    # Sort by score (highest first) and take top 3 sections
    scored.sort(key=lambda x: x[0], reverse=True)
    top_sections = [s[1] for s in scored[:3] if s[0] > 0]

    if not top_sections:
        # If no match found, return the full data
        return data[:2000]

    return "\n\n".join(top_sections)
