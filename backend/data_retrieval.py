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
    # List of common stop words to ignore in scoring
    stop_words = {"what", "when", "where", "which", "who", "whom", "whose", "why", "how", "does", "have", "with", "from", "about", "tell", "give", "info", "please"}

    words = [
        w.strip("?,.!;:\'\"()[]{}")
        for w in question_lower.split()
        if len(w.strip("?,.!;:\'\"()[]{}")) >= 3 and w.strip("?,.!;:\'\"()[]{}") not in stop_words
    ]

    # Score each section by how many question keywords it contains
    scored = []
    for section in sections:
        clean_section = section.strip()
        if not clean_section:
            continue
        section_lower = clean_section.lower()
        score = sum(1 for word in words if word in section_lower)
        # Give bonus weight if keywords match the section header (first line)
        first_line = section_lower.split("\n")[0]
        header_bonus = sum(2 for word in words if word in first_line)
        scored.append((score + header_bonus, clean_section))

    # Sort by score (highest first) and take top 4 sections
    scored.sort(key=lambda x: x[0], reverse=True)
    top_sections = [s[1] for s in scored[:4] if s[0] > 0]

    if not top_sections:
        # If no specific keyword match found, return first 3000 chars as general overview
        return data[:3000]

    return "\n\n---\n\n".join(top_sections)
