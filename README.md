# Duke DSP Alumni Directory 🧑‍🎓

An alumni directory built for the Duke chapter of Delta Sigma Pi. Designed to help brothers and alumni stay connected through a modern, secure, and filterable interface.

Built from scratch with a full-stack setup: Supabase, Next.js, Tailwind, and Vercel.

---

## 🚀 Features

- 🔐 Supabase authentication with secure onboarding
- 🔎 Dynamic filtering by industry, location, and graduation year
- 🧑‍💼 Editable user profiles with image uploads
- 🗂️ CSV import script to batch upload members
- 🎨 TailwindCSS for responsive, clean styling
- 🌐 Deployed on Vercel with environment-based config

---

## 🧠 Tech Stack

- **Next.js (App Router)** – Frontend framework and routing
- **Supabase** – Auth, PostgreSQL DB, file storage
- **TailwindCSS** – UI styling
- **Vercel** – Hosting and continuous deployment
- **Node.js** – Scripts and tooling

---

## 📁 Project Structure

```text
dsp-alumni-directory/
├── app/               # Next.js App Router routes and logic
├── components/        # Reusable React UI components
├── data/              # Static CSV alumni data (e.g., dsp_profiles.csv)
├── lib/               # Supabase client and helper functions
├── public/            # Static files and assets
├── scripts/           # Custom Node.js scripts (CSV import)
├── .env               # Server-side Supabase service keys (for scripts)
├── .env.local         # Client-side Supabase anon keys (for Next.js)
├── package.json       # Dependencies and project metadata
├── tailwind.config.ts # Tailwind configuration
├── next.config.ts     # Next.js configuration
└── README.md          # You're here
```

---

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/dsp-alumni-directory.git
cd dsp-alumni-directory
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Environment Variables

**For Next.js frontend (`.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**For server-side scripts (`.env`):**
```env
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 4. Run Locally

```bash
npm run dev
```

### 5. Import Alumni from CSV

- Place your alumni data file at `data/dsp_profiles.csv` (tab-delimited, with headers).
- Run the import script:

```bash
node scripts/import_profiles.js
```

---

## 🌐 Live Demo

[https://dukedsp.com](https://dukedsp.com)  
(Password protected for member privacy.)

---

## 🧠 Lessons Learned

- Managing full-stack auth with Supabase and Next.js
- Building dynamic UIs with filtering and conditionally rendered components
- Implementing real-time database interactions
- Separating client/server environments securely

---

## 📬 Want This for Your Org?

If you want a version of this alumni directory for your club, team, or university group, visit [alumna.in](https://alumna.in) or contact mehdi.touhamic@gmail.com
---

