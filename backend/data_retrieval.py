import os

# Path to your college data file
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "college_info.txt")

_CACHED_DATA = None


def load_data() -> str:
    """Load the full college info text file and keep in memory for zero disk I/O latency."""
    global _CACHED_DATA
    if _CACHED_DATA is None:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            _CACHED_DATA = f.read()
    return _CACHED_DATA


def retrieve_context(question: str) -> str:
    """
    Find the top 2 most targeted sections for minimal token prefill and fastest generation.
    """
    data = load_data()
    sections = data.split("##")

    question_lower = question.lower()
    stop_words = {"what", "when", "where", "which", "who", "whom", "whose", "why", "how", "does", "have", "with", "from", "about", "tell", "give", "info", "please"}

    words = [
        w.strip("?,.!;:\'\"()[]{}")
        for w in question_lower.split()
        if len(w.strip("?,.!;:\'\"()[]{}")) >= 3 and w.strip("?,.!;:\'\"()[]{}") not in stop_words
    ]

    scored = []
    for section in sections:
        clean_section = section.strip()
        if not clean_section:
            continue
        section_lower = clean_section.lower()
        score = sum(1 for word in words if word in section_lower)
        first_line = section_lower.split("\n")[0]
        header_bonus = sum(2 for word in words if word in first_line)
        scored.append((score + header_bonus, clean_section))

    scored.sort(key=lambda x: x[0], reverse=True)
    # Take top 2 most concise relevant sections for ultra-fast TTFT
    top_sections = [s[1] for s in scored[:2] if s[0] > 0]

    if not top_sections:
        return data[:1500]

    return "\n\n---\n\n".join(top_sections)
