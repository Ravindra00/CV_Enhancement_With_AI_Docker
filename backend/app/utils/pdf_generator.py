"""
PDF Generator for CV Enhancer
Generates a styled A4 PDF supporting theme (color, font, layout), 
custom sections, interests, and both German and English labels.
"""

from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import Image as RLImage
from typing import Dict, Any, Optional
import os, re

DEFAULT_COLOR = '#1a1a1a'

DEFAULT_LABELS_EN = {
    'summary': 'Profile',
    'experience': 'Professional Experience',
    'education': 'Education',
    'skills': 'Skills',
    'certifications': 'Certifications',
    'languages': 'Languages',
    'projects': 'Projects',
    'interests': 'Interests',
}

DEFAULT_LABELS_DE = {
    'summary': 'Profil',
    'experience': 'Berufserfahrung',
    'education': 'Bildung',
    'skills': 'Fähigkeiten',
    'certifications': 'Zertifikate',
    'languages': 'Sprachen',
    'projects': 'Projekte',
    'interests': 'Interessen',
}


def _hex_to_rl(hexstr: str):
    """Convert a hex color string to a reportlab color."""
    hexstr = hexstr.strip().lstrip('#')
    if len(hexstr) == 3:
        hexstr = ''.join(c*2 for c in hexstr)
    r, g, b = int(hexstr[0:2], 16), int(hexstr[2:4], 16), int(hexstr[4:6], 16)
    return colors.Color(r/255, g/255, b/255)


def _rgba_rl(hexstr: str, alpha=1.0):
    c = _hex_to_rl(hexstr)
    return colors.Color(c.red, c.green, c.blue, alpha)


def _detect_german(cv_data: dict) -> bool:
    """Heuristic: Is this CV predominantly German?"""
    sample = ""
    # Check both camelCase (personalInfo) and snake_case (personal_info) keys
    pi_camel = cv_data.get('personalInfo') or {}
    pi_snake = cv_data.get('personal_info') or {}
    sample += (pi_camel.get('jobTitle') or pi_camel.get('title') or '') + ' '
    sample += (pi_snake.get('title') or pi_snake.get('jobTitle') or '') + ' '
    summary = cv_data.get('summary') or cv_data.get('profile_summary') or ''
    sample += summary[:400] + ' '
    # Check both singular (experience) and plural (experiences) keys
    for exp in ((cv_data.get('experience') or []) + (cv_data.get('experiences') or []))[:3]:
        sample += (exp.get('description') or '')[:200] + ' '
    sample = sample.lower()

    # Distinctively German words/suffixes unlikely to appear in English text
    german_markers = [
        'erfahrung', 'kenntnisse', 'f\u00e4higkeiten', 'verantwortlich',
        'unternehmen', 't\u00e4tigkeiten', 'entwicklung', 'aufgaben',
        'bereich', 'mittels', 'wurden', 'wurde', 'habe', 'haben',
        'leitung', 'planung', 'umsetzung', 'werkzeug', 'arbeit',
        'datenbankadministrator', 'softwareentwickler', 'ingenieur',
    ]
    score = sum(1 for w in german_markers if w in sample)
    return score >= 2


def flatten_skills(skills) -> list:
    """Normalize skills to a flat list of strings."""
    if not skills:
        return []
    if isinstance(skills, list):
        return [s if isinstance(s, str) else (s.get('name') or '') for s in skills if s]
    if isinstance(skills, dict):
        result = []
        for items in skills.values():
            if isinstance(items, list):
                result.extend(
                    (s if isinstance(s, str) else s.get('name', ''))
                    for s in items if s
                )
        return [s for s in result if s]
    return []


def skills_as_categories(skills):
    """Return list of (category_name, [items]) tuples if skills is a dict, else None."""
    if not skills or not isinstance(skills, dict):
        return None
    result = []
    for cat, items in skills.items():
        if isinstance(items, list):
            flat = [(s if isinstance(s, str) else s.get('name', '')) for s in items if s]
            flat = [f for f in flat if f]
            if flat:
                result.append((cat, flat))
    return result if result else None


def generate_cv_pdf(
    cv_data: Dict[str, Any],
    title: str = "CV",
    theme: Optional[Dict[str, Any]] = None,
) -> bytes:
    """Generate a PDF from CV data and return bytes.
    
    cv_data keys accepted:
      personalInfo / personal_info — personal details dict
      summary / profile_summary   — profile text
      experience / experiences    — list of experience dicts
      education / educations      — list of education dicts
      skills                      — list or dict
      certifications               — list of cert dicts
      languages                   — list of language dicts
      projects                    — list of project dicts
      interests                   — list of strings or dicts
      custom_sections             — list of {title, content} dicts
      sectionLabels               — override label names
    """
    theme = theme or {}
    primary_hex = theme.get('primaryColor') or DEFAULT_COLOR
    layout = theme.get('layout', 'clean')

    PRIMARY = _hex_to_rl(primary_hex)
    PRIMARY_LIGHT = _rgba_rl(primary_hex, 0.15)
    GRAY = colors.HexColor('#6b7280')
    TEXT = colors.HexColor('#1a1a1a')

    buffer = BytesIO()

    # ----- Normalize input keys -----
    pi = cv_data.get('personalInfo') or cv_data.get('personal_info') or {}
    name = pi.get('name') or pi.get('full_name') or cv_data.get('full_name') or 'Your Name'
    job_headline = pi.get('title') or pi.get('jobTitle') or cv_data.get('title') or ''
    email = pi.get('email') or cv_data.get('email') or ''
    phone = pi.get('phone') or cv_data.get('phone') or ''
    location = pi.get('location') or cv_data.get('location') or ''
    linkedin = pi.get('linkedin') or pi.get('linkedin_url') or cv_data.get('linkedin_url') or ''
    website = pi.get('website') or ''
    summary = pi.get('summary') or cv_data.get('summary') or cv_data.get('profile_summary') or ''

    experiences = cv_data.get('experience') or cv_data.get('experiences') or []
    education_list = cv_data.get('education') or cv_data.get('educations') or []
    raw_skills = cv_data.get('skills') or []
    skills_flat = flatten_skills(raw_skills)
    certs = cv_data.get('certifications') or []
    langs = cv_data.get('languages') or []
    projects = cv_data.get('projects') or []
    raw_interests = cv_data.get('interests') or []
    interests = [
        (i if isinstance(i, str) else i.get('name') or i.get('interest') or '')
        for i in raw_interests if i
    ]
    interests = [i for i in interests if i]
    custom_sections = cv_data.get('custom_sections') or []

    # Language detection for labels
    is_german = _detect_german(cv_data)
    base_labels = DEFAULT_LABELS_DE if is_german else DEFAULT_LABELS_EN
    labels = {**base_labels, **(cv_data.get('sectionLabels') or {})}

    # Photo path resolution
    photo_path = pi.get('photo') or cv_data.get('photo_path') or ''
    photo_abs = ''
    if photo_path:
        # photo_path is usually like '/uploads/photo.jpg' or 'uploads/photo.jpg'
        # Resolve relative to the backend project root
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        clean_path = photo_path.lstrip('/')
        candidate = os.path.join(backend_dir, clean_path)
        if os.path.isfile(candidate):
            photo_abs = candidate

    def _make_photo_image(size_pts=72):
        """Return an RLImage for the profile photo with EXIF auto-rotation, or None."""
        if not photo_abs:
            return None
        try:
            # Use Pillow to auto-correct EXIF orientation
            from PIL import Image as PILImage, ExifTags
            import tempfile

            pil_img = PILImage.open(photo_abs)

            # Auto-rotate based on EXIF orientation tag
            try:
                exif = pil_img._getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag = ExifTags.TAGS.get(tag_id, tag_id)
                        if tag == 'Orientation':
                            rotations = {3: 180, 6: 270, 8: 90}
                            if value in rotations:
                                pil_img = pil_img.rotate(rotations[value], expand=True)
                            break
            except (AttributeError, Exception):
                pass  # No EXIF or not a JPEG — just use as-is

            # Convert to RGB (handles RGBA PNGs etc.)
            if pil_img.mode not in ('RGB', 'L'):
                pil_img = pil_img.convert('RGB')

            # Save to a temp PNG so ReportLab can render it cleanly
            tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
            pil_img.save(tmp.name, 'PNG')
            tmp.close()

            img = RLImage(tmp.name, width=size_pts, height=size_pts)
            return img
        except ImportError:
            # Pillow not installed — fall back to simple RLImage (no EXIF fix)
            try:
                return RLImage(photo_abs, width=size_pts, height=size_pts)
            except Exception:
                return None
        except Exception:
            return None

    # ----- Document -----
    is_modern_sidebar = (layout == 'modern')
    margin = 1.6 * cm

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin if not is_modern_sidebar else 0,
        rightMargin=margin if not is_modern_sidebar else 0,
        topMargin=0,
        bottomMargin=1.4 * cm,
        title=title,
    )

    styles = getSampleStyleSheet()

    def s(name_s, **kw):
        base = kw.pop('base', 'Normal')
        return ParagraphStyle(name_s, parent=styles[base], **kw)

    # Common styles
    body_style  = s('CVBody',     fontSize=8.5, textColor=TEXT, leading=13, spaceAfter=2)
    sub_style   = s('CVSub',     fontSize=8, textColor=GRAY, leading=12)
    bullet_s    = s('CVBullet',  fontSize=8.5, textColor=TEXT, leading=13, leftIndent=10)

    story = []

    # =======================================================================
    # CLEAN LAYOUT (default, matches German reference CV)
    # =======================================================================
    if layout in ('clean', 'minimal', 'executive'):
        name_style = s('CVName', fontSize=20 if layout=='clean' else 18, textColor=TEXT, fontName='Helvetica-Bold', leading=24, spaceAfter=1)
        title_style_p = s('CVTitleP', fontSize=10, textColor=GRAY, fontName='Helvetica', leading=14, spaceAfter=6)
        contact_style_p = s('CVContactP', fontSize=7.5, textColor=GRAY, fontName='Helvetica', leading=11)
        section_s = s('CVSection', fontSize=8.5, textColor=TEXT, fontName='Helvetica-Bold', spaceAfter=1, spaceBefore=6)

        def section_header(label):
            story.append(Spacer(1, 6))
            story.append(Paragraph(f'<b>{label.upper()}</b>', section_s))
            story.append(HRFlowable(width='100%', thickness=1.5, color=_hex_to_rl(primary_hex), spaceAfter=5))

        # ── Header (name + contact + optional photo) ──
        contact_parts = []
        if email:    contact_parts.append(f'\u2709  {email}')
        if phone:    contact_parts.append(f'\u2706  {phone}')
        if location: contact_parts.append(f'\ud83d\udccd  {location}')
        if linkedin: contact_parts.append(f'in  {linkedin}')
        if website:  contact_parts.append(f'\ud83d\udd17  {website}')
        contact_line = '    |    '.join(contact_parts)

        name_block = [Paragraph(name, name_style)]
        if job_headline: name_block.append(Paragraph(job_headline, title_style_p))
        if contact_line: name_block.append(Paragraph(contact_line, contact_style_p))

        story.append(Spacer(1, 12))

        photo_img = _make_photo_image(size_pts=54)
        if photo_img:
            # Two-column header: name+contact on left, photo on right
            header_row = [[name_block, photo_img]]
            photo_col_w = 58
            text_col_w = doc.width - photo_col_w
            ht = Table(header_row, colWidths=[text_col_w, photo_col_w])
            ht.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(ht)
        else:
            for p in name_block:
                story.append(p)

        story.append(Spacer(1, 8))
        story.append(HRFlowable(width='100%', thickness=2, color=TEXT, spaceAfter=12))

        # ── Body sections ──
        if summary:
            section_header(labels['summary'])
            story.append(Paragraph(summary, body_style))

        if experiences:
            section_header(labels['experience'])
            for exp in experiences:
                role = exp.get('role') or exp.get('position') or exp.get('job_title') or ''
                company = exp.get('company') or ''
                loc_e = exp.get('location') or ''
                start = exp.get('startDate') or ''
                end = ('Heute' if is_german else 'Present') if exp.get('current') else (exp.get('endDate') or '')
                date_str = f'{start} – {end}' if (start or end) else ''
                left_p = f'<b>{role}</b>'
                if company: left_p += f', {company}'
                if loc_e:   left_p += f' <font color="#6b7280">— {loc_e}</font>'
                row = [[Paragraph(left_p, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.73, doc.width * 0.27])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 1)]))
                story.append(t)
                desc = exp.get('description') or exp.get('responsibilities') or ''
                if desc:
                    for line in desc.split('\n'):
                        line = line.strip().lstrip('•-').strip()
                        if line:
                            story.append(Paragraph(f'• {line}', bullet_s))
                story.append(Spacer(1, 5))

        if education_list:
            section_header(labels['education'])
            for edu in education_list:
                degree = edu.get('degree') or ''
                field = edu.get('field') or edu.get('field_of_study') or ''
                inst = edu.get('institution') or edu.get('institution_name') or ''
                start = edu.get('startDate') or ''
                end_e = edu.get('endDate') or ''
                date_str = f'{start} – {end_e}' if (start or end_e) else ''
                deg_s = f'<b>{degree}</b>'
                if field: deg_s += f' – {field}'
                if inst:  deg_s += f', {inst}'
                row = [[Paragraph(deg_s, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.73, doc.width * 0.27])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
                story.append(t)
                if edu.get('grade'):
                    story.append(Paragraph(f'<font color="#6b7280">Note: {edu["grade"]}</font>', sub_style))
                story.append(Spacer(1, 4))

        if skills:
            section_header(labels['skills'])
            cats = skills_as_categories(cv_data.get('skills') or [])
            if cats:
                # Render each category as header + 3-col skill pills
                for cat_name, cat_items in cats:
                    story.append(Paragraph(f'<font color="#4b5563"><b>{cat_name}:</b></font>', sub_style))
                    cols = 3
                    cells = [Paragraph(f'\u2022 {s}', body_style) for s in cat_items if s]
                    while len(cells) % cols != 0:
                        cells.append(Paragraph('', body_style))
                    rows = [cells[i:i+cols] for i in range(0, len(cells), cols)]
                    col_w = doc.width / cols
                    t = Table(rows, colWidths=[col_w]*cols)
                    t.setStyle(TableStyle([
                        ('TOPPADDING', (0,0), (-1,-1), 1),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                        ('LEFTPADDING', (0,0), (-1,-1), 0),
                        ('RIGHTPADDING', (0,0), (-1,-1), 2),
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 3))
            else:
                # Flat list — 3 columns
                cols = 3
                skill_cells = [Paragraph(f'\u2022 {s.strip()}', body_style) for s in skills_flat if s.strip()]
                while len(skill_cells) % cols != 0:
                    skill_cells.append(Paragraph('', body_style))
                rows = [skill_cells[i:i+cols] for i in range(0, len(skill_cells), cols)]
                col_w = doc.width / cols
                skills_table = Table(rows, colWidths=[col_w] * cols)
                skills_table.setStyle(TableStyle([
                    ('TOPPADDING', (0,0), (-1,-1), 1),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 2),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ]))
                story.append(skills_table)
            story.append(Spacer(1, 2))

        if langs:
            section_header(labels['languages'])
            for l in langs:
                row = [[Paragraph(f'<b>{l.get("language","")}</b>', body_style), Paragraph(l.get('proficiency',''), sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.5, doc.width * 0.5])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
                story.append(t)

        if interests:
            section_header(labels['interests'])
            story.append(Paragraph('  ·  '.join(interests), body_style))

        if projects:
            section_header(labels['projects'])
            for p in projects:
                p_title = f'<b>{p.get("name","")}</b>'
                link = p.get('link') or p.get('url') or ''
                if link: p_title += f'  <font color="{primary_hex}">{link}</font>'
                story.append(Paragraph(p_title, body_style))
                if p.get('description'):
                    story.append(Paragraph(p['description'], sub_style))
                story.append(Spacer(1, 4))

        if certs:
            section_header(labels['certifications'])
            for c in certs:
                left_c = f'<b>{c.get("name","")}</b>'
                if c.get('issuer'): left_c += f' <font color="#6b7280">— {c["issuer"]}</font>'
                date_c = c.get('issueDate') or c.get('date') or ''
                row = [[Paragraph(left_c, body_style), Paragraph(date_c, sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.73, doc.width * 0.27])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
                story.append(t)

        # Custom sections
        for cs in custom_sections:
            cs_title = cs.get('title') or cs.get('name') or 'Section'
            cs_content = cs.get('content') or cs.get('text') or ''
            if cs_title and cs_content:
                section_header(cs_title)
                story.append(Paragraph(cs_content, body_style))

    # =======================================================================
    # CLASSIC LAYOUT  (colored header banner)
    # =======================================================================
    else:
        name_style  = s('CVName2', fontSize=20, textColor=colors.white, fontName='Helvetica-Bold', leading=24, spaceAfter=2)
        title_style2 = s('CVTitle2', fontSize=10, textColor=_rgba_rl('#ffffff', 0.85), fontName='Helvetica', leading=14)
        contact_s2  = s('CVContact2', fontSize=7.5, textColor=_rgba_rl('#ffffff', 0.9), fontName='Helvetica', leading=11)
        section_s2  = s('CVSection2', fontSize=8.5, textColor=PRIMARY, fontName='Helvetica-Bold', spaceAfter=2, spaceBefore=8)

        def section_header(label):
            story.append(Spacer(1, 4))
            story.append(Paragraph(f'<font color="{primary_hex}"><b>{label.upper()}</b></font>', section_s2))
            story.append(HRFlowable(width='100%', thickness=0.5, color=PRIMARY, spaceAfter=4))

        # ── Colored header with optional photo ──
        contact_parts = []
        if email:    contact_parts.append(f'\u2709  {email}')
        if phone:    contact_parts.append(f'\u2706  {phone}')
        if location: contact_parts.append(f'\u231b  {location}')
        if linkedin: contact_parts.append(f'in  {linkedin}')
        if website:  contact_parts.append(f'\ud83d\udd17  {website}')
        contact_line = '    |    '.join(contact_parts)

        name_block = [Paragraph(name, name_style)]
        if job_headline: name_block.append(Paragraph(job_headline, title_style2))
        if contact_line: name_block.append(Paragraph(contact_line, contact_s2))

        photo_img = _make_photo_image(size_pts=50)
        if photo_img:
            # Two-column header inside colored band: text left, photo right
            header_col_data = [[name_block, photo_img]]
            photo_col_w = 56
            text_col_w = doc.width + 2 * margin - photo_col_w - 36
            header_inner = Table(header_col_data, colWidths=[text_col_w, photo_col_w])
            header_inner.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            header_table = Table([[header_inner]], colWidths=[doc.width + 2 * margin])
        else:
            header_content = name_block
            header_table = Table([[p] for p in header_content], colWidths=[doc.width + 2 * margin])

        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
            ('TOPPADDING', (0, 0), (-1, 0), 16),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 14),
            ('LEFTPADDING', (0, 0), (-1, -1), 18),
            ('RIGHTPADDING', (0, 0), (-1, -1), 18),
            ('TOPPADDING', (0, 1), (-1, -1), 2),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))

        # Body — reuse clean renderer with classic labels
        if summary:
            section_header(labels['summary'])
            story.append(Paragraph(summary, body_style))

        if experiences:
            section_header(labels['experience'])
            for exp in experiences:
                role = exp.get('role') or exp.get('position') or exp.get('job_title') or ''
                company = exp.get('company') or ''
                loc_e = exp.get('location') or ''
                start = exp.get('startDate') or ''
                end_x = ('Present') if exp.get('current') else (exp.get('endDate') or '')
                date_str = f'{start} – {end_x}' if (start or end_x) else ''
                left_p = f'<b>{role}</b>'
                if company: left_p += f' <font color="{primary_hex}"><b>· {company}</b></font>'
                if loc_e:   left_p += f' <font color="#6b7280">— {loc_e}</font>'
                row = [[Paragraph(left_p, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width*0.73, doc.width*0.27])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),1)]))
                story.append(t)
                desc = exp.get('description') or ''
                if desc:
                    for line in desc.split('\n'):
                        line = line.strip().lstrip('•-').strip()
                        if line: story.append(Paragraph(f'• {line}', bullet_s))
                story.append(Spacer(1, 5))

        if education_list:
            section_header(labels['education'])
            for edu in education_list:
                degree = edu.get('degree') or ''
                field = edu.get('field') or ''
                inst = edu.get('institution') or ''
                start = edu.get('startDate') or ''
                end_e = edu.get('endDate') or ''
                date_str = f'{start} – {end_e}' if (start or end_e) else ''
                deg_s = f'<b>{degree}</b>'
                if field: deg_s += f' in {field}'
                if inst:  deg_s += f' <font color="{primary_hex}"><b>· {inst}</b></font>'
                row = [[Paragraph(deg_s, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width*0.73, doc.width*0.27])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
                story.append(t)
                if edu.get('grade'):
                    story.append(Paragraph(f'<font color="#6b7280">Grade: {edu["grade"]}</font>', sub_style))
                story.append(Spacer(1, 4))

        if skills_flat:
            section_header(labels['skills'])
            cols = 3
            skill_cells = [Paragraph(f'\u2022 {s.strip()}', body_style) for s in skills_flat if s.strip()]
            while len(skill_cells) % cols != 0:
                skill_cells.append(Paragraph('', body_style))
            rows = [skill_cells[i:i+cols] for i in range(0, len(skill_cells), cols)]
            col_w = doc.width / cols
            skills_table = Table(rows, colWidths=[col_w] * cols)
            skills_table.setStyle(TableStyle([
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 2),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(skills_table)

        if langs:
            section_header(labels['languages'])
            for l in langs:
                row = [[Paragraph(f'<b>{l.get("language","")}</b>', body_style), Paragraph(l.get('proficiency',''), sub_style)]]
                t = Table(row, colWidths=[doc.width*0.5, doc.width*0.5])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
                story.append(t)

        if interests:
            section_header(labels['interests'])
            story.append(Paragraph('  ·  '.join(interests), body_style))

        if certs:
            section_header(labels['certifications'])
            for c in certs:
                left_c = f'<b>{c.get("name","")}</b>'
                if c.get('issuer'): left_c += f' <font color="#6b7280">— {c["issuer"]}</font>'
                row = [[Paragraph(left_c, body_style), Paragraph(c.get('issueDate') or c.get('date',''), sub_style)]]
                t = Table(row, colWidths=[doc.width*0.73, doc.width*0.27])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
                story.append(t)

        if projects:
            section_header(labels['projects'])
            for p in projects:
                p_title = f'<b>{p.get("name","")}</b>'
                link = p.get('link') or p.get('url') or ''
                if link: p_title += f'  <font color="{primary_hex}">{link}</font>'
                story.append(Paragraph(p_title, body_style))
                if p.get('description'): story.append(Paragraph(p['description'], sub_style))
                story.append(Spacer(1, 4))

        for cs in custom_sections:
            cs_title = cs.get('title') or cs.get('name') or 'Section'
            cs_content = cs.get('content') or cs.get('text') or ''
            if cs_title and cs_content:
                section_header(cs_title)
                story.append(Paragraph(cs_content, body_style))

    doc.build(story)
    return buffer.getvalue()
