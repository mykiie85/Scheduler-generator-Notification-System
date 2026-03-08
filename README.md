🧪 Laboratory Staff Scheduler & Notification System

A web-based system for managing laboratory staff scheduling and automatically notifying staff via WhatsApp using n8n automation and Evolution API.

This system was designed for hospital laboratories such as Mwananyamala Regional Referral Hospital Laboratory to streamline staff duty assignments and communication.

📌 Features
📅 Staff Scheduling

The system allows administrators to manage multiple types of staff allocations:

Weekly duty allocation

Monthly roster generation

Holiday shift assignments

Event duty scheduling

Staff announcements

📢 Automated Notifications

When an administrator triggers Notify Staff, the system:

Sends data to n8n via Webhook

n8n processes the scheduling data

WhatsApp notifications are sent automatically via Evolution API

Notifications include:

Duty assignments

Section responsibilities

Performance expectations

Excel roster attachments

🏥 Supported Laboratory Sections

The system supports multiple laboratory sections such as:

Emergency Laboratory

Main Laboratory

BIMA Laboratory

EMD Laboratory

Laboratory Management

⚙️ System Architecture
Lab Scheduler Web App
        │
        ▼
   n8n Webhooks
        │
        ▼
   Workflow Processing
        │
        ▼
   Evolution API
        │
        ▼
   WhatsApp Notifications
🧠 Automation Workflows

The system uses n8n workflows to automate communication.

Webhooks
Page	Webhook
Roster Generation	/webhook/20d4cb09-4285-4614-914f-xxxxxxxxxxx
Weekly Allocation	/webhook/5046d729-cf16-40f7-b9xxxxxxxxxxxxxxx
Holiday Shifts	/webhook/aa378e69-b27b-4df7-b98a-xxxxxxxxxxxx
Events	/webhook/ec97b29e-9e95-48f6-af5b-xxxxxxxxxxxxx
Announcements	/webhook/2d6429b8-6735-46c5-81ae-xxxxxxxxxxxxxx

Each webhook triggers a workflow that:

Processes input data

Generates WhatsApp messages

Sends notifications

📩 WhatsApp Integration

WhatsApp notifications are sent using Evolution API.

Supported message types:

Text messages

Document attachments (Excel roster)

Broadcast notifications

Example message:

📅 March 2026 - Laboratory Department

Hello Mike Levison Sanga,

You have been assigned laboratory duties.

Hospital: Mwananyamala Regional Referral Hospital
Section: Emergency Lab

Please review the attached duty roster.

Laboratory Management
📄 File Attachments

The system can send:

.xlsx roster files

duty schedules

announcements

Files are sent using base64 or URL media messages.

🐳 Deployment

The automation server runs n8n in Docker on Render.

Required Environment Variables
N8N_HOST=n8n-p5jx.onrender.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n-p5jx.onrender.com
N8N_EDITOR_BASE_URL=https://n8n-p5jx.onrender.com
💾 Persistent Storage

To prevent workflow loss during redeployments, attach a Render Persistent Disk:

Mount Path:
/home/node/.n8n

This stores:

workflows

credentials

execution logs

🔐 Security

Webhooks should be protected with:

secret headers

API keys

request validation

Example header:

x-lab-secret: your-secret-key
🚀 Future Improvements

Planned enhancements include:

Staff confirmation replies via WhatsApp

Duty swap requests

Staff availability tracking

Automated roster generation

Delivery logs and reporting

Single webhook routing system

👨‍💻 Developer

Mike Levison Sanga

Laboratory Technologist & Systems Developer
Mwananyamala Regional Referral Hospital Laboratory

📜 License

This project is intended for hospital laboratory workflow automation and internal staff scheduling.