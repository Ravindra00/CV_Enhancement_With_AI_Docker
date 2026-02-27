import os
from groq import Groq

api_key = os.getenv('GROQ_API_KEY')
if not api_key:
    print("❌ GROQ_API_KEY not set!")
    exit(1)

client = Groq(api_key=api_key)
response = client.messages.create(
    model="gemma2-9b-it",
    max_tokens=100,
    messages=[{"role": "user", "content": "Hello"}]
)
print("✅ Groq works:", response.content[0].text)