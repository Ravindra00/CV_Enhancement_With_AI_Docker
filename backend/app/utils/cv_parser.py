"""
CV Text Extraction and Parsing Module
Supports PDF (via pdfplumber) and DOCX (via python-docx).
Handles multilingual CVs: English, German, French, Spanish, etc.
"""

import os
import re
from typing import Dict, List, Any, Optional


# ── Section keyword maps (multilingual) ──────────────────────────────────────
SECTION_KEYWORDS = {
    'summary': [
        'profil', 'profile', 'summary', 'professional summary', 'about me',
        'objective', 'career objective', 'über mich', 'kurzprofil',
        'zusammenfassung', 'berufsprofil', 'persönliches profil',
        'resume summary', 'executive summary', 'profil professionnel',
        'résumé', 'acerca de', 'perfil',
    ],
    'experience': [
        'berufserfahrung', 'erfahrung', 'beruflicher werdegang', 'arbeitserfahrung',
        'professional experience', 'work experience', 'employment history',
        'experience', 'career history', 'work history', 'positions held',
        'expérience professionnelle', 'expérience', 'experiencia laboral',
        'experiencia profesional', 'esperienze lavorative',
    ],
    'education': [
        'ausbildung', 'bildung', 'studium', 'schulbildung', 'qualifikationen',
        'akademischer werdegang', 'hochschulbildung',
        'education', 'academic background', 'qualifications',
        'academic qualifications', 'educational background',
        'formation', 'études', 'educación', 'formazione',
    ],
    'skills': [
        'kenntnisse', 'fähigkeiten', 'kompetenzen', 'it-kenntnisse',
        'technische kenntnisse', 'soft skills', 'hard skills',
        'skills', 'technical skills', 'core competencies', 'competencies',
        'expertise', 'technologies', 'tools', 'languages & tools',
        'compétences', 'habilidades', 'competenze',
    ],
    'certifications': [
        'zertifikate', 'zertifizierungen', 'zertifikationen', 'qualifikationen',
        'certifications', 'certificates', 'professional certifications',
        'licences & certifications', 'awards & certifications',
        'certifications & awards', 'credentials',
        'certifications', 'diplômes', 'certificaciones',
    ],
    'languages': [
        'sprachkenntnisse', 'sprachen', 'fremdsprachen',
        'languages', 'language skills', 'foreign languages',
        'langues', 'idiomas', 'lingue',
    ],
    'projects': [
        'projekte', 'projektarbeit', 'nebenprojekte',
        'projects', 'personal projects', 'side projects', 'portfolio',
        'key projects', 'notable projects',
        'projets', 'proyectos', 'progetti',
    ],
    'interests': [
        'interessen', 'hobbys', 'hobbies', 'freizeit',
        'interests', 'hobbies', 'activities', 'volunteering',
    ],
}

# Months in multiple languages for date parsing
MONTHS = {
    # English
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    # German
    'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
    'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12,
}


def extract_text_from_file(file_path: str) -> str:
    """Extract text from CV file. Supports PDF and DOCX."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return _extract_pdf(file_path)
    elif ext in ('.doc', '.docx'):
        return _extract_docx(file_path)
    else:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            raise ValueError(f"Failed to extract text: {str(e)}")


def _extract_pdf(file_path: str) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return '\n'.join(text_parts)
    except ImportError:
        raise ValueError("pdfplumber not installed. Run: pip install pdfplumber")
    except Exception as e:
        raise ValueError(f"PDF extraction failed: {str(e)}")


def _extract_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)
        return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        raise ValueError("python-docx not installed. Run: pip install python-docx")
    except Exception as e:
        raise ValueError(f"DOCX extraction failed: {str(e)}")


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_cv_text(text: str) -> Dict[str, Any]:
    """
    Parse CV text into structured data.
    Handles multilingual CVs (German, English, etc.)
    Returns a dict matching the CVParsedData schema.
    """
    parsed: Dict[str, Any] = {
        'personalInfo': {},
        'summary': '',
        'experience': [],
        'education': [],
        'skills': [],
        'certifications': [],
        'languages': [],
        'projects': [],
        'sectionLabels': {},
    }

    lines = [l.rstrip() for l in text.split('\n')]
    clean_lines = [l.strip() for l in lines if l.strip()]

    # ── Personal info ──────────────────────────────────────────────────────
    parsed['personalInfo'] = _extract_personal_info(text, clean_lines)

    # ── Identify sections ─────────────────────────────────────────────────
    sections = _split_into_sections(lines)

    # ── Parse each section ────────────────────────────────────────────────
    for section_type, (header, content_lines) in sections.items():
        content = '\n'.join(content_lines).strip()
        if section_type == 'summary':
            parsed['summary'] = ' '.join(content.split())[:800]
        elif section_type == 'experience':
            parsed['experience'] = _parse_experience(content_lines)
        elif section_type == 'education':
            parsed['education'] = _parse_education(content_lines)
        elif section_type == 'skills':
            parsed['skills'] = _parse_skills(content)
        elif section_type == 'certifications':
            parsed['certifications'] = _parse_certifications(content_lines)
        elif section_type == 'languages':
            parsed['languages'] = _parse_languages(content_lines)
        elif section_type == 'projects':
            parsed['projects'] = _parse_projects(content_lines)

    return parsed


# ── Personal info extraction ──────────────────────────────────────────────────

def _extract_personal_info(text: str, lines: List[str]) -> Dict[str, str]:
    info: Dict[str, str] = {}

    # Email
    emails = re.findall(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', text)
    if emails:
        info['email'] = emails[0]

    # Phone — handles international formats
    phones = re.findall(
        r'(?:\+?[\d\s\-\(\)\.]{10,20})',
        re.sub(r'[^\d\s\-\(\)\+]', ' ', text)
    )
    phones = [p.strip() for p in phones if len(re.sub(r'\D', '', p)) >= 8]
    if phones:
        info['phone'] = phones[0].strip()

    # LinkedIn
    linkedin = re.findall(r'(?:linkedin\.com/in/|linkedin/)([\w\-]+)', text, re.IGNORECASE)
    if linkedin:
        info['linkedin'] = f"linkedin.com/in/{linkedin[0]}"
    elif re.search(r'Linkedin/(\w+)', text, re.IGNORECASE):
        m = re.search(r'Linkedin/(\w+)', text, re.IGNORECASE)
        if m:
            info['linkedin'] = f"linkedin.com/in/{m.group(1)}"

    # GitHub
    github = re.findall(r'github\.com/([\w\-]+)', text, re.IGNORECASE)
    if github:
        info['website'] = f"github.com/{github[0]}"

    # Website (non-linkedin, non-github)
    if 'website' not in info:
        urls = re.findall(
            r'(?:https?://)?(?:www\.)?[\w\-]+\.(?:com|io|dev|co|net|org|de|at|ch)(?:/[\w\-./]*)?',
            text, re.IGNORECASE
        )
        skip = {'linkedin.com', 'github.com'}
        clean_urls = [u for u in urls if not any(s in u.lower() for s in skip) and '.' in u]
        if clean_urls:
            info['website'] = clean_urls[0]

    # Location — look for city + country / city + state patterns
    location_patterns = [
        r'([A-Z][a-zäöüÄÖÜ]+(?:\s[A-Z][a-zäöüÄÖÜ]+)*),\s*([A-Z][a-zäöüÄÖÜ]+(?:\s[A-Z][a-zäöüÄÖÜ]+)*)',
        r'(München|Munich|Berlin|Frankfurt|Hamburg|Cologne|Köln|Stuttgart|Vienna|Zürich|London|New York|San Francisco)',
    ]
    for pat in location_patterns:
        m = re.search(pat, text)
        if m:
            info['location'] = m.group(0)
            break

    # Name — usually first 1-2 non-empty lines before any contact info
    for line in lines[:5]:
        # Skip lines that contain email/phone/icon chars
        if re.search(r'[@\+\d{4}]', line):
            continue
        # Skip very short lines (likely icons/symbols) or section headers
        words = line.split()
        if 2 <= len(words) <= 5 and all(w[0].isupper() if w else True for w in words if w.isalpha()):
            info['name'] = line.strip()
            break

    # Job title — usually line immediately after name
    if info.get('name'):
        name_idx = next((i for i, l in enumerate(lines) if info['name'] in l), -1)
        if name_idx >= 0 and name_idx + 1 < len(lines):
            candidate = lines[name_idx + 1].strip()
            if (candidate and 2 < len(candidate) < 60
                    and not re.search(r'[@\+]', candidate)
                    and not re.search(r'\d{4}', candidate)):
                info['jobTitle'] = candidate

    return info


# ── Section splitting ─────────────────────────────────────────────────────────

def _split_into_sections(lines: List[str]) -> Dict[str, tuple]:
    """
    Identify section headers and group lines under each section.
    Returns dict: {section_type: (header_line, [content_lines])}
    """
    sections: Dict[str, tuple] = {}
    current_type: Optional[str] = None
    current_header = ''
    current_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_type:
                current_lines.append('')
            continue

        # Check if this line is a section header
        detected = _detect_section_header(stripped)
        if detected and detected not in sections:
            # Save previous section
            if current_type and current_lines:
                sections[current_type] = (current_header, _clean_section_lines(current_lines))
            current_type = detected
            current_header = stripped
            current_lines = []
        else:
            if current_type:
                current_lines.append(stripped)

    # Save last section
    if current_type and current_lines:
        sections[current_type] = (current_header, _clean_section_lines(current_lines))

    return sections


def _detect_section_header(line: str) -> Optional[str]:
    """Check if a line is a known section header. Returns section type or None."""
    # Headers are typically short, ALL CAPS or Title Case, possibly with icon prefix
    # Strip common icon prefixes (emoji, box chars)
    cleaned = re.sub(r'^[\W\s]+', '', line).strip()
    lower = cleaned.lower().rstrip(':').strip()

    # Must be short enough to be a header
    if len(lower) > 60 or len(lower) < 2:
        return None

    # Must look like a header (mostly alpha chars)
    if len(re.sub(r'[^a-zA-ZäöüÄÖÜß\s\-&]', '', lower)) < len(lower) * 0.6:
        return None

    for section_type, keywords in SECTION_KEYWORDS.items():
        for kw in keywords:
            if lower == kw or lower.startswith(kw) or kw == lower:
                return section_type

    return None


def _clean_section_lines(lines: List[str]) -> List[str]:
    # Remove leading/trailing empty lines
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines


# ── Experience parsing ────────────────────────────────────────────────────────

# Date pattern: "06/2022 – 01/2025", "April 2022 – present", "2022 – 2023"
DATE_RANGE_RE = re.compile(
    r'(\d{1,2}/\d{4}|\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|'
    r'januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)'
    r'[\s.]*\d{4})'
    r'\s*[–\-—\/]\s*'
    r'(\d{1,2}/\d{4}|\d{4}|present|heute|aktuell|current|'
    r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|'
    r'januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)'
    r'[\s.]*\d{4})',
    re.IGNORECASE
)

def _parse_experience(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Parse experience section into structured job entries.
    Detects job title + company lines and groups bullet points under them.
    """
    entries = []
    current: Optional[Dict] = None
    bullets: List[str] = []

    def flush():
        nonlocal current, bullets
        if current:
            if bullets:
                current['description'] = '\n'.join(bullets)
            entries.append(current)
        current = None
        bullets = []

    for line in lines:
        if not line:
            continue

        date_match = DATE_RANGE_RE.search(line)

        # Line with a date range — likely a job header
        if date_match:
            start_raw = date_match.group(1)
            end_raw = date_match.group(2)

            # Extract title/company from the same line (before the date)
            before_date = line[:date_match.start()].strip().rstrip(',').strip()
            after_date = line[date_match.end():].strip()

            # Try to split "Title, Company" or "Title · Company"
            role, company = _split_title_company(before_date)

            flush()
            current = {
                'role': role,
                'company': company,
                'location': after_date if after_date else '',
                'startDate': _normalize_date(start_raw),
                'endDate': '' if re.search(r'present|heute|aktuell|current', end_raw, re.I) else _normalize_date(end_raw),
                'current': bool(re.search(r'present|heute|aktuell|current', end_raw, re.I)),
                'description': '',
            }
        elif current is None and line and not line.startswith('•') and not line.startswith('-'):
            # Could be company/title line without date on same line
            role, company = _split_title_company(line)
            if role:
                current = {
                    'role': role,
                    'company': company,
                    'location': '',
                    'startDate': '',
                    'endDate': '',
                    'current': False,
                    'description': '',
                }
        elif current is not None:
            # Detect location line (city, country/state pattern)
            if re.match(r'^[A-Z][a-z].*,\s*[A-Z]', line) and len(line.split()) <= 6:
                if not current.get('location'):
                    current['location'] = line
            # Bullet point
            elif line.startswith(('•', '-', '–', '*', '\u2022', '\u25cf')):
                bullets.append(line.lstrip('•-–* ').strip())
            elif len(line) > 15:
                bullets.append(line)

    flush()
    return entries


def _split_title_company(text: str) -> tuple:
    """Split 'Job Title, Company Name' into (role, company)."""
    if not text:
        return '', ''
    # Try comma split: "Title, Company"
    for sep in [',', ' bei ', ' at ', ' @', ' – ', ' — ', '·']:
        if sep.lower() in text.lower():
            idx = text.lower().index(sep.lower())
            role = text[:idx].strip().strip('"\'')
            company = text[idx + len(sep):].strip().strip('"\'')
            if role and company:
                return role, company
    return text.strip(), ''


def _normalize_date(raw: str) -> str:
    """Convert various date formats to YYYY-MM."""
    raw = raw.strip()
    # Already in MM/YYYY format
    m = re.match(r'^(\d{1,2})/(\d{4})$', raw)
    if m:
        return f"{m.group(2)}-{m.group(1).zfill(2)}"
    # Just a year
    m = re.match(r'^(\d{4})$', raw)
    if m:
        return m.group(1)
    # Month name + year (e.g. "April 2022", "April.2022")
    m = re.match(r'^([a-zA-ZäöüÄÖÜ]+)[\s.]+(\d{4})$', raw)
    if m:
        month_name = m.group(1).lower()
        year = m.group(2)
        month_num = MONTHS.get(month_name[:3])
        if month_num:
            return f"{year}-{str(month_num).zfill(2)}"
        return year
    return raw


# ── Education parsing ─────────────────────────────────────────────────────────

def _parse_education(lines: List[str]) -> List[Dict[str, str]]:
    entries = []
    current: Optional[Dict] = None

    def flush():
        if current:
            entries.append(current)

    for line in lines:
        if not line:
            continue
        date_match = DATE_RANGE_RE.search(line)
        if date_match:
            flush()
            before = line[:date_match.start()].strip()
            degree, institution = _split_degree_institution(before)
            start_raw = date_match.group(1)
            end_raw = date_match.group(2)
            current = {
                'institution': institution,
                'degree': degree,
                'field': '',
                'startDate': _normalize_date(start_raw),
                'endDate': '' if re.search(r'present|heute|current', end_raw, re.I) else _normalize_date(end_raw),
                'grade': '',
            }
        elif current and re.search(r'(note|grade|gpa|ects|abschluss)', line, re.I):
            grade_m = re.search(r'[\d,\.]+', line)
            if grade_m:
                current['grade'] = grade_m.group()
        elif not current and line:
            degree, institution = _split_degree_institution(line)
            if degree or institution:
                current = {
                    'institution': institution,
                    'degree': degree,
                    'field': '',
                    'startDate': '',
                    'endDate': '',
                    'grade': '',
                }

    flush()
    return entries


def _split_degree_institution(text: str) -> tuple:
    """Split 'Degree, Institution' into components."""
    if not text:
        return '', ''
    for sep in [',', ' an der ', ' at ', ' – ', ' — ', '·']:
        if sep.lower() in text.lower():
            idx = text.lower().index(sep.lower())
            a = text[:idx].strip()
            b = text[idx + len(sep):].strip()
            # Heuristic: institution tends to have "University", "Institut", "School" etc.
            uni_words = ['university', 'universität', 'hochschule', 'college', 'school',
                         'institute', 'akademie', 'fachhochschule', 'gymnasium', 'berufsschule']
            if any(w in b.lower() for w in uni_words):
                return a, b
            elif any(w in a.lower() for w in uni_words):
                return b, a
            return a, b
    return text, ''


# ── Skills parsing ────────────────────────────────────────────────────────────

def _parse_skills(content: str) -> List[Dict[str, str]]:
    """Extract skill tokens from a skills section."""
    # Remove common label prefixes like "Datenbanken:" or "Sprachen:"
    content = re.sub(r'^[^:]{1,30}:\s*', '', content, flags=re.MULTILINE)
    # Split by common delimiters
    raw_skills = re.split(r'[,|•·\n\t\/]+', content)
    skills = []
    for s in raw_skills:
        s = s.strip().strip('•-–* ')
        # Skip empty, too long (sentences), or purely numeric
        if 1 < len(s) < 50 and not s.isnumeric():
            skills.append({'name': s, 'level': '', 'category': ''})
    # Deduplicate while preserving order
    seen = set()
    result = []
    for skill_obj in skills:
        key = skill_obj['name'].lower()
        if key not in seen:
            seen.add(key)
            result.append(skill_obj)
    return result[:30]


# ── Certifications parsing ────────────────────────────────────────────────────

def _parse_certifications(lines: List[str]) -> List[Dict[str, str]]:
    certs = []
    for line in lines:
        if not line:
            continue
        date_m = re.search(r'\d{4}', line)
        date = date_m.group() if date_m else ''
        name = line[:date_m.start()].strip().rstrip('–—-,') if date_m else line
        if len(name) > 2:
            certs.append({'name': name.strip(), 'issuer': '', 'date': date})
    return certs


# ── Languages parsing ─────────────────────────────────────────────────────────

PROFICIENCY_KEYWORDS = {
    'Native': ['muttersprache', 'native', 'erstsprache', 'muttersprachlich'],
    'Fluent': ['fließend', 'verhandlungssicher', 'fluent', 'full professional', 'c1', 'c2'],
    'Advanced': ['fortgeschritten', 'advanced', 'sehr gut', 'upper intermediate', 'b2'],
    'Intermediate': ['mittelstufe', 'intermediate', 'gut', 'gute kenntnisse', 'b1', 'a2'],
    'Basic': ['grundkenntnisse', 'basic', 'elementary', 'beginner', 'a1'],
}

def _parse_languages(lines: List[str]) -> List[Dict[str, str]]:
    langs = []
    for line in lines:
        if not line:
            continue
        # Common format: "English – Fluent" or "English: C1"
        m = re.match(r'^([A-Za-zäöüÄÖÜ]+(?:\s[A-Za-z]+)?)\s*[:\-–—]\s*(.+)$', line)
        if m:
            lang_name = m.group(1).strip()
            level_text = m.group(2).strip().lower()
            proficiency = _map_proficiency(level_text)
            langs.append({'language': lang_name, 'proficiency': proficiency})
        elif re.match(r'^[A-Za-zäöüÄÖÜ]{3,20}$', line.split()[0] if line.split() else ''):
            # Just a language name on its own line
            lang_name = line.strip()
            langs.append({'language': lang_name, 'proficiency': 'Fluent'})
    return langs[:10]


def _map_proficiency(text: str) -> str:
    for level, keywords in PROFICIENCY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return level
    return 'Intermediate'


# ── Projects parsing ──────────────────────────────────────────────────────────

def _parse_projects(lines: List[str]) -> List[Dict[str, str]]:
    projects = []
    current: Optional[Dict] = None

    for line in lines:
        if not line:
            continue
        # A project title tends to be short and not a bullet
        if not line.startswith(('•', '-', '–')) and len(line) < 80 and not DATE_RANGE_RE.search(line):
            if current:
                projects.append(current)
            current = {'name': line, 'description': '', 'url': ''}
        elif current:
            url_m = re.search(r'(https?://\S+|github\.com/\S+)', line, re.I)
            if url_m:
                current['url'] = url_m.group(1)
            else:
                desc = line.lstrip('•-– ').strip()
                current['description'] = (current['description'] + ' ' + desc).strip()

    if current:
        projects.append(current)
    return projects


# ── Simple fallback suggestions ───────────────────────────────────────────────

def generate_suggestions(cv_data: Dict[str, Any], job_description: str) -> List[Dict[str, str]]:
    """Simple fallback suggestions."""
    suggestions = []
    if not cv_data.get('summary'):
        suggestions.append({
            'title': 'Add a Profile Summary',
            'description': 'A summary section helps recruiters understand your value quickly.',
            'suggestion': 'Write a 2-3 sentence career summary at the top of your CV.',
            'section': 'summary',
        })
    return suggestions


# ── Main parse_cv_file function ───────────────────────────────────────────────

def parse_cv_file(file_path: str) -> Dict[str, Any]:
    """
    Extract text from a CV file and parse it into structured data.
    Supports PDF, DOCX, and plain text files.
    Handles multilingual CVs (German, English, etc.)
    
    Returns:
        Dict with structure:
        {
            'personalInfo': {...},
            'summary': str,
            'experience': [...],
            'education': [...],
            'skills': [...],
            'certifications': [...],
            'languages': [...],
            'projects': [...],
            'sectionLabels': {...},
            'raw_text': str  # Original extracted text
        }
    """
    try:
        # Extract text from file
        raw_text = extract_text_from_file(file_path)
        
        # Parse the text into structured data
        parsed_data = parse_cv_text(raw_text)
        
        # Add raw text for reference
        parsed_data['raw_text'] = raw_text
        
        return parsed_data
        
    except Exception as e:
        # Return empty structure on error so upload doesn't completely fail
        return {
            'personalInfo': {},
            'summary': '',
            'experience': [],
            'education': [],
            'skills': [],
            'certifications': [],
            'languages': [],
            'projects': [],
            'sectionLabels': {},
            'raw_text': '',
            'parse_error': str(e)
        }
