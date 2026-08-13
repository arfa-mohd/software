import requests

PHONE_NUMBER_ID = "1213160175221250"
WHATSAPP_TOKEN = "EAArlmq3GcaYBSE3FNhMpxYKC8izLzFZBQOdDXxDckdv8wUe0wFxzmOoF3cKYS2Nrxyj8H4GxottV7by2iUCcNjoASTJQXrKRKIPecm8oncBMiu4t26GYiRCZAL1CfY049QkmH0ZAlFYgEPLh3XuuOwObqrAZBlFkZBNZAiyB9bP1MBsZCmdqGZBrlZBkLlNW7ZAi6BBAjUaNPNCqpHAmfym00uIoiWGIoA7ZCKtmfoyJq0SVekNEZC7yZBvohKpGZCx1xSlVyU26JbUUTtNoWyprZCRjbkJOHHQ"

url = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"
headers = {
    "Authorization": f"Bearer {WHATSAPP_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "messaging_product": "whatsapp",
    "to": "916379558054",
    "type": "template",
    "template": {
        "name": "hello_world",
        "language": {"code": "en_US"}
    }
}

try:
    res = requests.post(url, json=payload, headers=headers, timeout=10)
    print("STATUS CODE:", res.status_code)
    print("RESPONSE JSON:", res.json())
except Exception as e:
    print("ERROR:", e)
