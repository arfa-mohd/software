import os
import requests
from fastapi import APIRouter, Request, Response, Query
from typing import Optional
from dotenv import load_dotenv
import schemas
import database
from services import ai_service

load_dotenv()

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Automation"])

# Meta Credentials from Environment Variables or User Provided Keys
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID", "1213160175221250")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "EAArlmq3GcaYBSE3FNhMpxYKC8izLzFZBQOdDXxDckdv8wUe0wFxzmOoF3cKYS2Nrxyj8H4GxottV7by2iUCcNjoASTJQXrKRKIPecm8oncBMiu4t26GYiRCZAL1CfY049QkmH0ZAlFYgEPLh3XuuOwObqrAZBlFkZBNZAiyB9bP1MBsZCmdqGZBrlZBkLlNW7ZAi6BBAjUaNPNCqpHAmfym00uIoiWGIoA7ZCKtmfoyJq0SVekNEZC7yZBvohKpGZCx1xSlVyU26JbUUTtNoWyprZCRjbkJOHHQ")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "auracare_webhook_secret_123")

@router.get("/chats")
def get_whatsapp_chats():
    return database.get_whatsapp_chats()

@router.get("/messages")
def get_whatsapp_messages(phone_number: str = Query(...)):
    return database.get_whatsapp_messages(phone_number)

@router.get("/today")
def get_today_whatsapp_messages():
    return database.get_today_whatsapp_messages()

@router.post("/chat", response_model=schemas.WhatsAppChatResponse)

def handle_whatsapp_chat(req: schemas.WhatsAppChatRequest):
    return ai_service.process_whatsapp_message(req.phone_number, req.message)

# --- Meta WhatsApp Cloud API Webhooks ---

@router.get("/webhook")
def verify_meta_webhook(
    mode: Optional[str] = Query(None, alias="hub.mode"),
    token: Optional[str] = Query(None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(None, alias="hub.challenge")
):
    """Meta Webhook Verification Endpoint"""
    print(f"Webhook Verification Attempt - mode: {mode}, token: {token}, challenge: {challenge}")
    if mode == "subscribe" and token == VERIFY_TOKEN:
        print("Webhook verified successfully!")
        return Response(content=str(challenge or ""), media_type="text/plain", status_code=200)
    print(f"Webhook verification failed. Expected token: '{VERIFY_TOKEN}', Received token: '{token}'")
    return Response(content="Verification failed", status_code=403)

@router.post("/webhook")
async def receive_meta_whatsapp_message(request: Request):
    """Live Incoming WhatsApp Message Handler from Meta Cloud API"""
    try:
        data = await request.json()
        print("\n=================== INCOMING META WEBHOOK ===================")
        print("Raw Payload:", data)
        
        entries = data.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                if "messages" in value:
                    for message_obj in value["messages"]:
                        from_phone = message_obj.get("from", "")
                        formatted_phone = f"+{from_phone}" if not from_phone.startswith("+") else from_phone
                        print(f"[INCOMING] WhatsApp message from {formatted_phone}: {message_obj}")
                        
                        user_msg = ""
                        if "text" in message_obj:
                            user_msg = message_obj["text"].get("body", "")
                        elif "button" in message_obj:
                            user_msg = message_obj["button"].get("text", "")
                        elif "interactive" in message_obj:
                            int_type = message_obj["interactive"].get("type")
                            if int_type == "button_reply":
                                user_msg = message_obj["interactive"]["button_reply"].get("title", "")
                            elif int_type == "list_reply":
                                user_msg = message_obj["interactive"]["list_reply"].get("title", "")
                        
                        if user_msg:
                            print(f"[PROCESSING] AI Message: '{user_msg}' for {formatted_phone}")
                            # 1. Process AI Triage / Bot response in AuraCare AI Engine
                            res = ai_service.process_whatsapp_message(formatted_phone, user_msg)
                            print(f"[AI REPLY] Generated reply for {formatted_phone}")
                            
                            # 2. Send AI Reply Back to Real WhatsApp via Meta Graph API
                            send_meta_reply(from_phone, res["reply"])
    except Exception as e:
        import traceback
        print("[ERROR] Meta Webhook Processing Error:", str(e))
        traceback.print_exc()
        
    return {"status": "success"}

def send_meta_reply(to_phone: str, reply_text: str):
    """Call Meta Cloud API Graph Endpoint to dispatch message to patient's phone"""
    phone_id = os.getenv("PHONE_NUMBER_ID", PHONE_NUMBER_ID)
    token = os.getenv("WHATSAPP_TOKEN", WHATSAPP_TOKEN)
    
    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Strip markdown formatting for native WhatsApp clean display
    clean_text = reply_text.replace("**", "*")
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": clean_text}
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        print("Meta API Response:", resp.status_code, resp.json())
    except Exception as e:
        print("Failed to dispatch Meta API reply:", e)

from pydantic import BaseModel

class BulkClientItem(BaseModel):
    id: str
    name: str
    phone: str
    doctor: Optional[str] = "Consultant Doctor"

class BulkCampaignRequest(BaseModel):
    title: Optional[str] = "Special Healthcare Campaign"
    template: str
    clients: List[BulkClientItem]

@router.post("/send_bulk_campaign")
def send_bulk_whatsapp_campaign(req: BulkCampaignRequest):
    """Direct Server-Side API to Send WhatsApp Campaign to ALL Clients in 1 Click"""
    sent_list = []
    phone_id = os.getenv("PHONE_NUMBER_ID", PHONE_NUMBER_ID)
    token = os.getenv("WHATSAPP_TOKEN", WHATSAPP_TOKEN)
    
    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    for c in req.clients:
        clean_phone = c.phone.replace("+", "").replace(" ", "").replace("-", "")
        if len(clean_phone) == 10:
            clean_phone = "91" + clean_phone
        
        # Build personalized message text
        msg = req.template.replace("{name}", c.name)
        msg = msg.replace("{doctor}", c.doctor or "Consultant Doctor")
        msg = msg.replace("{hospital}", "AuraCare Nexus Hospital")
        
        meta_status = "Sent"
        error_detail = None

        # Dispatch via Meta Cloud API
        try:
            clean_text = msg.replace("**", "*")
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {"body": clean_text}
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            res_json = resp.json()
            print(f"Meta API Dispatch to {clean_phone}:", resp.status_code, res_json)
            
            if resp.status_code != 200:
                meta_status = "Meta Error"
                error_detail = res_json.get("error", {}).get("message", "Meta API Error")
            
            if hasattr(database, 'add_whatsapp_message'):
                database.add_whatsapp_message(clean_phone, "outbound", msg)
        except Exception as e:
            print(f"Error sending WhatsApp to {clean_phone}: {e}")
            meta_status = "Failed"
            error_detail = str(e)
        
        sent_list.append({
            "id": c.id,
            "phone": clean_phone,
            "name": c.name,
            "status": meta_status,
            "error": error_detail
        })

    return {
        "status": "success",
        "total_sent": len(sent_list),
        "clients": sent_list
    }
