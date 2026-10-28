import base64, json, sys, urllib.request

# Usage: python3 -I scripts/gen-hand.py [reference.png] [out.png]
ref = sys.argv[1] if len(sys.argv) > 1 else 'scripts/og-hand.png'
out = sys.argv[2] if len(sys.argv) > 2 else 'scripts/hand-raw.png'
model = 'google/gemini-3-pro-image'
key = next(l.split('=', 1)[1].strip() for l in open('.env.local') if l.startswith('OPENROUTER_API_KEY='))

prompt = (
    "Recreate ONLY the hand and arm from this reference image as a new photorealistic studio photo, in exactly "
    "the same pose and angle: a man's right hand seen from the back, index finger extended pointing up and to the "
    "right, other fingers curled, wrist slightly bent. White shirt cuff, black business suit sleeve. The forearm "
    "comes in diagonally from the bottom-left corner and the sleeve exits through the bottom-left edges of the "
    "frame. The fingertip is near the top-right of the frame and fully visible. Sharp focus, soft natural light. "
    "Background is a perfectly flat, uniform pure chroma green (#00FF00) with no shadows, gradients or texture. "
    "No phone, no UI, nothing else in the image."
)
ref_b64 = base64.b64encode(open(ref, 'rb').read()).decode()
body = {
    'model': model,
    'messages': [{'role': 'user', 'content': [
        {'type': 'text', 'text': prompt},
        {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{ref_b64}'}},
    ]}],
    'modalities': ['image', 'text'],
    'image_config': {'aspect_ratio': '3:4'},
}
req = urllib.request.Request(
    'https://openrouter.ai/api/v1/chat/completions',
    data=json.dumps(body).encode(),
    headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
)
res = json.load(urllib.request.urlopen(req, timeout=300))
url = res['choices'][0]['message']['images'][0]['image_url']['url']
open(out, 'wb').write(base64.b64decode(url.split(',', 1)[1]))
print('saved', out, res.get('usage', {}).get('cost'))
