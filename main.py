from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from html import escape
from urllib.parse import parse_qs

from data import load_guests_from_db, lookup_guest, seed_tanaka_profile

app = FastAPI()


@app.on_event("startup")
async def startup() -> None:
    seed_tanaka_profile()
    load_guests_from_db()


@app.get("/")
async def root():
    return {"status": "ok", "service": "threshold"}


async def _twilio_param(request: Request, name: str) -> str:
    if name in request.query_params:
        return request.query_params[name]

    body = await request.body()
    parsed = parse_qs(body.decode("utf-8"))
    return parsed.get(name, [""])[0]


@app.post("/voice")
@app.get("/voice")
async def voice(request: Request):
    from_number = await _twilio_param(request, "From")
    guest = lookup_guest(from_number)

    if guest:
        greeting = f"Welcome back, {guest['name']}. The pipe is working. Goodbye."
    else:
        greeting = "Welcome to Rosewood Sand Hill. The pipe is working. Goodbye."

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{escape(greeting)}</Say>
    <Hangup/>
</Response>"""
    return PlainTextResponse(content=twiml, media_type="application/xml")
