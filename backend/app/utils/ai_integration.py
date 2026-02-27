"""
AI Integration Module
Handles LLM API calls for CV enhancement and cover letter generation
Uses Groq API SDK (free tier available)

Note: Groq frequently deprecates models. This version tries multiple models
in order until one works, so it stays current automatically.
"""

import os
import json
from typing import Optional, Dict, List
from datetime import datetime

# ✅ Load environment variables
from dotenv import load_dotenv
load_dotenv()

# ✅ Initialize Groq client
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY not set! AI features will not work.")
    client = None
else:
    print("✅ GROQ_API_KEY loaded")
    client = Groq(api_key=GROQ_API_KEY)

# ✅ Models to try (in order of preference)
# Keep this list updated with current Groq models
# Check: https://console.groq.com/docs/models
GROQ_MODELS = [
    # "mixtral-8x7b-32k",           # Try this first
    # "mixtral-8x7b-instruct-v0.1", # Alternative
    # "mixtral-8x7b-instruct",      # Another alternative
    # "llama2-70b-4096", 
    "openai/gpt-oss-120b"                    # Fallback
]

# Will be set after first successful call
WORKING_MODEL = None


def _get_working_model():
    """
    Get a working model by trying each one in the list.
    Caches the result so we don't keep trying bad models.
    """
    global WORKING_MODEL
    
    # If we already found a working model, use it
    if WORKING_MODEL:
        return WORKING_MODEL
    
    # If no client, we can't test
    if not client:
        print("⚠️  No Groq client available")
        return None
    
    print("🔍 Testing available Groq models...")
    
    # Try each model
    for model in GROQ_MODELS:
        try:
            print(f"   Trying {model}...", end=" ")
            
            # Quick test with minimal request
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=10,
                temperature=0.7
            )
            
            # If we got here, the model works!
            print("✅ Works!")
            WORKING_MODEL = model
            return model
            
        except Exception as e:
            error_msg = str(e)
            if "decommissioned" in error_msg.lower():
                print("❌ Decommissioned")
            elif "does not exist" in error_msg.lower():
                print("❌ Doesn't exist")
            else:
                print(f"❌ Error: {error_msg[:50]}")
            continue
    
    print("❌ No working models found! Using fallback template.")
    return None


# ============================================================================
# COVER LETTER GENERATION
# ============================================================================

def generate_cover_letter(cv_data: dict, job_description: str, user_name: str = "User") -> str:
    """
    Generate a professional cover letter using Groq API.
    Returns plain text string (not JSON object).
    
    Args:
        cv_data: Dictionary containing CV information
        job_description: Job description text
        user_name: Name of the person
    
    Returns:
        Plain text cover letter string
    """
    try:
        print(f"\n{'='*70}")
        print(f"🤖 [generate_cover_letter] Starting...")
        print(f"{'='*70}")
        
        # ✅ Check if client is initialized
        if not client:
            print("⚠️  Groq client not initialized, using fallback")
            return _generate_fallback_cover_letter(user_name, job_description)
        
        # Get a working model
        model = _get_working_model()
        if not model:
            print("⚠️  No working Groq model available, using fallback")
            return _generate_fallback_cover_letter(user_name, job_description)
        
        # Build CV summary
        name = cv_data.get('full_name', user_name)
        summary = cv_data.get('summary', '')
        
        print(f"   Name: {name}")
        print(f"   Summary: {summary[:50]}..." if summary else "   Summary: (empty)")
        
        # Build skills list
        skills = cv_data.get('skills', [])
        skills_text = ""
        if skills:
            if isinstance(skills, list):
                skill_names = [
                    s.get('name', str(s)) if isinstance(s, dict) else str(s)
                    for s in skills
                ]
                skills_text = ", ".join(skill_names[:10])
            else:
                skills_text = str(skills)
        
        print(f"   Skills: {skills_text[:80]}...")
        
        # Build experience summary
        experiences = cv_data.get('experiences', [])
        experience_text = ""
        if experiences and isinstance(experiences, list) and len(experiences) > 0:
            exp = experiences[0]
            if isinstance(exp, dict):
                company = exp.get('company', 'my previous company')
                position = exp.get('position', exp.get('role', 'position'))
                experience_text = f"As a {position} at {company}, I"
            else:
                experience_text = "In my previous roles, I"
        else:
            experience_text = "In my professional experience, I"
        
        print(f"   Experience: {experience_text}")
        
        # Build prompt
        prompt = f"""You are a professional cover letter writer. 

Generate a professional, compelling cover letter based on this information:

**Candidate Information:**
- Name: {name}
- Professional Summary: {summary}
- Key Skills: {skills_text}
- Background: {experience_text}

**Job Description:**
{job_description}

Write a professional cover letter that:
1. Opens with a strong hook
2. Highlights relevant skills that match the job
3. Shows enthusiasm for the role
4. Closes with a call to action
5. Is 3-4 paragraphs long
6. Uses professional but personable tone

Return ONLY the cover letter text, no headers or metadata. Start directly with "Dear Hiring Manager," or similar."""

        print(f"\n📤 Sending to Groq API...")
        print(f"   Model: {model}")
        print(f"   Max tokens: 1000")
        
        # ✅ Call Groq API using SDK
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        print(f"\n✅ Response from Groq!")
        
        # Extract text from response
        if response.choices and len(response.choices) > 0:
            letter_text = response.choices[0].message.content
            
            if letter_text:
                letter_text = letter_text.strip()
                print(f"   Generated text: {len(letter_text)} chars")
                print(f"   Tokens used: {response.usage.total_tokens}")
                print(f"\n✅ SUCCESS! Generated {len(letter_text)} chars")
                print(f"   First 100 chars: {letter_text[:100]}...")
                print(f"{'='*70}\n")
                return letter_text
            else:
                print(f"⚠️  Empty response from API, using fallback")
                return _generate_fallback_cover_letter(name, job_description)
        else:
            print(f"❌ No choices in response!")
            return _generate_fallback_cover_letter(name, job_description)
    
    except Exception as e:
        print(f"❌ ERROR in generate_cover_letter:")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)[:200]}")
        return _generate_fallback_cover_letter(user_name, job_description)


def _generate_fallback_cover_letter(name: str, job_description: str) -> str:
    """
    Generate a basic cover letter template when AI is unavailable.
    Returns plain text string.
    """
    date = datetime.now().strftime("%B %d, %Y")
    
    fallback = f"""{date}

Dear Hiring Manager,

I am writing to express my strong interest in the position outlined in your job description. With my professional background and comprehensive skill set, I am confident that I can contribute meaningfully to your team.

My experience has equipped me with a deep understanding of the key responsibilities and requirements you're seeking. I am particularly drawn to this opportunity because of your organization's commitment to excellence and innovation in the industry.

I would welcome the opportunity to discuss how my background, skills, and enthusiasm align with your team's needs. Thank you for considering my application, and I look forward to hearing from you.

Sincerely,
{name}
"""
    
    print(f"\n📝 Using fallback cover letter ({len(fallback)} chars)")
    return fallback


# ============================================================================
# JOB DESCRIPTION EXTRACTION
# ============================================================================

def extract_job_description(url: str) -> Optional[str]:
    """
    Extract job description from URL using web scraping.
    Uses cookie-reject headers to bypass cookie consent dialogs.
    """
    try:
        import requests
        from bs4 import BeautifulSoup

        print(f"\n🔍 Extracting job description from: {url}")

        session = requests.Session()

        # Browser-like headers that reject cookies / consent walls
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/122.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            # Reject all non-essential cookies automatically
            'Cookie': 'cookieConsent=rejected; OptanonConsent=isGpcEnabled=0&datestamp=&version=&isIABGlobal=false&hosts=&consentId=&interactionCount=1&landingPath=&groups=C0001:0,C0002:0,C0003:0,C0004:0; euconsent-v2=rejected',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'no-cache',
            'DNT': '1',
        }

        response = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        if response.status_code != 200:
            print(f"❌ Failed to fetch URL (status {response.status_code})")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Remove scripts, styles, nav, header, footer, cookie banners
        for tag in soup(['script', 'style', 'nav', 'header', 'footer',
                         'aside', 'noscript', 'iframe', 'form',
                         '[class*="cookie"]', '[id*="cookie"]',
                         '[class*="consent"]', '[id*="consent"]']):
            tag.decompose()

        # Try to find the main job description container
        # (common class names across LinkedIn, Indeed, Stepstone, Xing, etc.)
        job_selectors = [
            {'class': 'description__text'},        # LinkedIn
            {'class': 'jobsearch-JobComponent'},   # Indeed
            {'id': 'job-details'},                 # Indeed alt
            {'class': 'job-description'},
            {'class': 'jobDescriptionContent'},
            {'class': 'jobDescription'},
            {'class': 'offer-body'},               # Stepstone
            {'class': 'job-ad-display'},           # Xing
            {'attrs': {'data-testid': 'job-description'}},
        ]

        text = None
        for selector in job_selectors:
            el = soup.find('div', **selector)
            if el:
                text = el.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    print(f"✅ Found job section via selector {selector}")
                    break

        # Fallback: take the largest <article> or <main> or whole body
        if not text or len(text) < 200:
            for tag_name in ['article', 'main', 'body']:
                el = soup.find(tag_name)
                if el:
                    t = el.get_text(separator='\n', strip=True)
                    if len(t) > len(text or ''):
                        text = t

        if not text:
            text = soup.get_text(separator='\n', strip=True)

        # Clean up: collapse excessive blank lines
        import re
        text = re.sub(r'\n{3,}', '\n\n', text).strip()

        extracted = text[:3000]
        print(f"✅ Extracted {len(extracted)} chars from {url}")
        return extracted

    except Exception as e:
        print(f"❌ Error extracting job description: {str(e)}")
        return None


# ============================================================================
# CV ANALYSIS
# ============================================================================

def analyze_cv(cv_data: Dict) -> Dict:
    """
    Analyze CV and generate insights using Groq API.
    
    Args:
        cv_data: Dictionary containing CV information
    
    Returns:
        Dictionary with analysis results
    """
    try:
        print(f"\n🔍 [analyze_cv] Starting...")
        
        if not client:
            print("⚠️  Groq client not initialized")
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        
        model = _get_working_model()
        if not model:
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        
        personal_info = cv_data.get('personal_info', {})
        experiences = cv_data.get('experiences', [])
        educations = cv_data.get('educations', [])
        skills = cv_data.get('skills', [])
        
        # Extract skill names
        skill_names = []
        for skill in skills:
            if isinstance(skill, dict):
                skill_names.append(skill.get('name', ''))
            else:
                skill_names.append(str(skill))
        
        cv_summary = f"""
Name: {personal_info.get('name', 'Not provided')}
Skills: {', '.join(skill_names[:10])}
Experience: {len(experiences)} positions
Education: {len(educations)} degrees
"""
        
        prompt = f"""Analyze this CV and provide insights in JSON format with 'strengths' (list), 'improvements' (list), and 'score' (0-100):

CV Summary:
{cv_summary}

Respond with ONLY valid JSON, no other text:
{{"strengths": ["strength1", "strength2"], "improvements": ["improvement1", "improvement2"], "score": 75}}
"""
        
        print(f"📤 Sending to Groq API...")
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )
        
        if response.choices and len(response.choices) > 0:
            response_text = response.choices[0].message.content
            
            try:
                # Clean the response
                response_clean = response_text.replace('```json', '').replace('```', '').strip()
                analysis = json.loads(response_clean)
                print(f"✅ Analysis parsed successfully")
                return {'analysis': analysis, 'status': 'success'}
            except json.JSONDecodeError as e:
                print(f"⚠️  Failed to parse JSON: {str(e)}")
                return {
                    'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                    'status': 'parse_error'
                }
        
        print(f"❌ No content in response")
        return {
            'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 0},
            'status': 'api_error'
        }
        
    except Exception as e:
        print(f"❌ ERROR in analyze_cv: {str(e)}")
        return {
            'analysis': {'strengths': [], 'improvements': [], 'score': 0},
            'status': 'error',
            'error': str(e)
        }


# ============================================================================
# CV ENHANCEMENT
# ============================================================================

def groq_enhance_sections(cv_data: Dict, job_description: str) -> Dict:
    """
    Use Groq AI to regenerate the three ATS-critical CV sections:
      - experiences  (rewrite descriptions / responsibilities)
      - projects     (rewrite descriptions, add relevant tech)
      - skills       (keep format, add / highlight missing keywords)

    Uses the same client & model-resolution pattern as generate_cover_letter.
    Personal info, certifications, languages, interests are NOT touched.

    Returns:
        {
          "status": "success" | "error",
          "enhanced_cv": { ...full cv_data with rewritten sections... }
        }
    """
    try:
        print(f"\n✨ [groq_enhance_sections] Starting...")

        if not client:
            print("⚠️  Groq client not initialized")
            return {"enhanced_cv": cv_data, "status": "api_error"}

        model = _get_working_model()
        if not model:
            return {"enhanced_cv": cv_data, "status": "api_error"}

        experiences = cv_data.get("experiences", []) or []
        projects    = cv_data.get("projects",    []) or []
        skills      = cv_data.get("skills",      []) or []

        # ── Build a compact snapshot of current sections for the prompt ──────
        import json as _json

        exp_json  = _json.dumps(experiences[:5],  ensure_ascii=False)
        proj_json = _json.dumps(projects[:5],     ensure_ascii=False)
        skills_json = _json.dumps(skills,         ensure_ascii=False)

        # ── Detect language of the CV ─────────────────────────────────────────
        # Sample text from the CV for language detection
        pi = cv_data.get('personalInfo') or cv_data.get('personal_info') or {}
        sample_text = " ".join([
            exp_json[:400],
            proj_json[:200],
            skills_json[:200],
            str(pi.get('summary') or cv_data.get('summary') or '')[:300],
        ]).lower()

        # Use ONLY unambiguously German words (not prepositions like 'und', 'mit', 'für' that appear in English too)
        german_indicators = [
            "erfahrung", "kenntnisse", "fähigkeiten", "verantwortlich",
            "tätigkeiten", "unternehmen", "entwicklung", "berufserfahrung",
            "wurde", "haben", "leitung", "planung", "umsetzung",
            "mitarbeiter", "aufgaben", "ausbildung", "studium", "abschluss",
            "deutsch", "englisch", "muttersprache", "bewerber",
            "softwareentwickler", "projektmanager", "werkzeuge", "bildung",
        ]
        german_score = sum(1 for w in german_indicators if w in sample_text)
        language = "German" if german_score >= 2 else "English"

        if language == "German":
            language_instruction = (
                "***LANGUAGE REQUIREMENT — HIGHEST PRIORITY***\n"
                "This CV is in GERMAN. You MUST write EVERY word of your output in German.\n"
                "Do NOT use English at all — not for descriptions, not for bullet points, not for skills.\n"
                "All rewritten text must be natural, professional German.\n"
                "***END LANGUAGE REQUIREMENT***"
            )
        else:
            language_instruction = "Write all output text in English."

        prompt = f"""{language_instruction}

You are an expert CV writer specialising in ATS optimisation.

TASK: Rewrite *only* the three sections below so the candidate's CV scores higher
against the Job Description.  Keep the same JSON structure/field names.

RULES:
1. Experiences: rewrite the "description" (or "responsibilities") field for each
   entry to include relevant keywords, quantified achievements, and action verbs.
   Do NOT change company, role, dates or any other field.
2. Projects: rewrite the "description" field to highlight relevant technologies
   from the JD.  Do NOT change name, link, dates or other fields.
3. Skills: if skills is a dict of categories keep the same structure and add
   relevant missing keywords;  if it is a flat list add relevant items.
   Keep it reasonable (max +5 per category or +8 total for a flat list).
4. Return ONLY valid JSON — no markdown fences, no extra text.
{"5. ALL TEXT must be in GERMAN. No English words in descriptions or skills." if language == 'German' else ''}

JOB DESCRIPTION:
{job_description[:1500]}

CURRENT EXPERIENCES (JSON):
{exp_json}

CURRENT PROJECTS (JSON):
{proj_json}

CURRENT SKILLS (JSON):
{skills_json}

Return this exact shape:
{{
  "experiences": [ ...same entries with improved description... ],
  "projects":    [ ...same entries with improved description... ],
  "skills":      <same shape as input — dict or list>
}}"""


        print(f"📤 Sending enhance request to Groq (model: {model})...")

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.6,
        )

        if not (response.choices and len(response.choices) > 0):
            print("❌ No choices in Groq response")
            return {"enhanced_cv": cv_data, "status": "api_error"}

        raw = response.choices[0].message.content or ""
        # Strip optional markdown fences
        raw = raw.replace("```json", "").replace("```", "").strip()

        import re as _re

        def _safe_json_loads(text: str):
            """Try multiple strategies to parse potentially malformed LLM JSON."""
            # Strategy 1: direct parse
            try:
                return _json.loads(text)
            except _json.JSONDecodeError:
                pass

            # Strategy 2: extract outermost {...} block and parse
            m = _re.search(r'\{.*\}', text, _re.DOTALL)
            if m:
                try:
                    return _json.loads(m.group())
                except _json.JSONDecodeError:
                    pass

            # Strategy 3: fix common issues — unescaped control chars inside strings
            # Replace literal newlines/tabs inside JSON string values with \n / \t
            try:
                # Replace literal \n and \t inside string values (between quotes) with escaped versions
                # We do this by scanning the string character-by-character to be safe
                fixed = []
                in_str = False
                escape_next = False
                for ch in text:
                    if escape_next:
                        fixed.append(ch)
                        escape_next = False
                        continue
                    if ch == '\\':
                        fixed.append(ch)
                        escape_next = True
                        continue
                    if ch == '"':
                        in_str = not in_str
                        fixed.append(ch)
                        continue
                    if in_str:
                        if ch == '\n':
                            fixed.append('\\n')
                            continue
                        if ch == '\r':
                            fixed.append('\\r')
                            continue
                        if ch == '\t':
                            fixed.append('\\t')
                            continue
                    fixed.append(ch)
                cleaned = ''.join(fixed)
                # Remove trailing commas before ] or }
                cleaned = _re.sub(r',\s*([}\]])', r'\1', cleaned)
                m2 = _re.search(r'\{.*\}', cleaned, _re.DOTALL)
                if m2:
                    return _json.loads(m2.group())
            except Exception:
                pass

            return None  # All strategies failed

        enhanced_sections = _safe_json_loads(raw)
        if not enhanced_sections or not isinstance(enhanced_sections, dict):
            print(f"⚠️  Could not find/parse JSON object in Groq response — returning original CV")
            return {"enhanced_cv": cv_data, "status": "parse_error"}

        # ── Merge enhanced sections back into the full CV ────────────────────
        enhanced_cv = dict(cv_data)  # shallow copy keeps personal_info etc.

        if "experiences" in enhanced_sections and isinstance(enhanced_sections["experiences"], list):
            # Only overwrite entries that were in scope (up to 5)
            new_exps = list(experiences)
            for i, enhanced_exp in enumerate(enhanced_sections["experiences"]):
                if i < len(new_exps) and isinstance(enhanced_exp, dict):
                    merged = dict(new_exps[i])
                    # Update only the description/responsibilities fields
                    if "description" in enhanced_exp:
                        merged["description"] = enhanced_exp["description"]
                    if "responsibilities" in enhanced_exp:
                        merged["responsibilities"] = enhanced_exp["responsibilities"]
                    new_exps[i] = merged
            enhanced_cv["experiences"] = new_exps

        if "projects" in enhanced_sections and isinstance(enhanced_sections["projects"], list):
            new_projs = list(projects)
            for i, enhanced_proj in enumerate(enhanced_sections["projects"]):
                if i < len(new_projs) and isinstance(enhanced_proj, dict):
                    merged = dict(new_projs[i])
                    if "description" in enhanced_proj:
                        merged["description"] = enhanced_proj["description"]
                    new_projs[i] = merged
            enhanced_cv["projects"] = new_projs

        if "skills" in enhanced_sections:
            enhanced_cv["skills"] = enhanced_sections["skills"]

        print("✅ Sections enhanced successfully")
        return {"enhanced_cv": enhanced_cv, "status": "success"}

    except Exception as e:
        print(f"❌ ERROR in groq_enhance_sections: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"enhanced_cv": cv_data, "status": "error", "error": str(e)}


def enhance_cv_for_job(cv_data: Dict, job_description: str) -> Dict:
    """
    Create enhanced CV tailored to job description.
    
    Args:
        cv_data: Dictionary containing CV information
        job_description: Target job description
    
    Returns:
        Dictionary with enhanced CV data
    """
    try:
        print(f"\n✨ [enhance_cv_for_job] Starting...")
        
        if not client:
            print("⚠️  Groq client not initialized")
            return {'enhanced_cv': cv_data, 'status': 'api_error'}
        
        model = _get_working_model()
        if not model:
            return {'enhanced_cv': cv_data, 'status': 'api_error'}
        
        experiences = cv_data.get('experiences', [])
        
        # Create experience summary
        exp_summary = "\n".join([
            f"- {e.get('position', '')} at {e.get('company', '')} ({e.get('startDate', '')} to {e.get('endDate', '')})"
            for e in experiences[:3]
        ])
        
        prompt = f"""Based on this job description, optimize the CV experiences to better match the role.
Return JSON with 'enhanced_experiences' array where each item has 'description' field with improved text:

Job Description:
{job_description[:1000]}

Current Experiences:
{exp_summary}

For each experience, improve the description to highlight the most relevant skills and achievements.
Return ONLY JSON, no other text:
{{"enhanced_experiences": [{{"description": "improved description 1"}}, {{"description": "improved description 2"}}]}}
"""
        
        print(f"📤 Sending to Groq API...")
        
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        if response.choices and len(response.choices) > 0:
            response_text = response.choices[0].message.content
            
            try:
                response_clean = response_text.replace('```json', '').replace('```', '').strip()
                enhanced = json.loads(response_clean)
                
                # Build enhanced CV data
                enhanced_cv = cv_data.copy()
                
                if 'enhanced_experiences' in enhanced and enhanced_cv.get('experiences'):
                    for i, exp_data in enumerate(enhanced['enhanced_experiences']):
                        if i < len(enhanced_cv['experiences']):
                            if 'description' in exp_data:
                                enhanced_cv['experiences'][i]['description'] = exp_data['description']
                
                print(f"✅ CV enhanced successfully")
                return {'enhanced_cv': enhanced_cv, 'status': 'success'}
            except json.JSONDecodeError as e:
                print(f"⚠️  Failed to parse JSON: {str(e)}")
                return {'enhanced_cv': cv_data, 'status': 'parse_error'}
        
        print(f"❌ No content in response")
        return {'enhanced_cv': cv_data, 'status': 'api_error'}
        
    except Exception as e:
        print(f"❌ ERROR in enhance_cv_for_job: {str(e)}")
        return {'enhanced_cv': cv_data, 'status': 'error', 'error': str(e)}