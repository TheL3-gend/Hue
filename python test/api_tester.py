import google.generativeai as genai

# Configure the API key
genai.configure(api_key="AIzaSyCWV75v_5yFpqjTy8WABGFwAgxmg3juSq4")

model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content("Explain how AI works in a few words")
print(response.text)