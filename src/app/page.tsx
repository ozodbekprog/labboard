import Link from "next/link";

const FEATURES = [
  {
    icon: "🧪",
    title: "Laboratoriya doskasi",
    text: "Cheksiz doska + interaktiv simulyatsiyalar: grafik plotter, ballistika, Mendeleyev jadvali, tarix lentasi, kod runner — bir panelda.",
  },
  {
    icon: "🎥",
    title: "Jonli darslar",
    text: "Video/audio xonalar (LiveKit), ekran ulashish, ishtirokchilar — o'qituvchi va talaba real vaqtda birga ishlaydi.",
  },
  {
    icon: "👥",
    title: "Guruhlar va rollar",
    text: "O'qituvchi, talaba va guruhlar. Har bir guruhga xonalar, darslar va materiallar bog'lanadi.",
  },
  {
    icon: "📅",
    title: "Dars jadvali",
    text: "Haftalik jadval, dars yaratish, eslatmalar — barcha mashg'ulotlar bir joyda.",
  },
  {
    icon: "🤖",
    title: "AI yordamchi",
    text: "Dars kontekstida savol bering: tushuntirish, misollar, test savollari ishlab berish. (Kalit sozlanadi.)",
  },
  {
    icon: "⚡",
    title: "Real-time sinxronizatsiya",
    text: "Yozgan, chizgan hamma narsa bir zumda hammaga ko'rinadi — WebSocket orqali.",
  },
];

const SUBJECTS = ["Matematika", "Fizika", "Kimyo", "Biologiya", "Tarix", "Informatika"];

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-lg font-bold text-white">
            L
          </div>
          <span className="text-lg font-semibold text-slate-900">LabBoard</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/sign-in" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">
            Kirish
          </Link>
          <Link href="/sign-up" className="btn-primary rounded-lg px-4 py-2 font-medium text-white">
            Bepul boshlash
          </Link>
        </nav>
      </header>

      <section className="flex flex-col items-center py-20 text-center">
        <div className="glass mb-6 rounded-full px-4 py-1.5 text-xs text-slate-600">
          Universitetlar uchun yangi avlod platformasi
        </div>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          Doska emas — <span className="gradient-text">laboratoriya</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Tarixdan tortib matematika, fizika, kimyo va coding gacha — barcha fanlar uchun real vaqtda
          ishlaydigan interaktiv simulyatsiyalar, jonli video darslar va AI yordamchi bir platformada.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-up" className="btn-primary rounded-xl px-6 py-3 font-medium text-white">
            Bepul boshlash
          </Link>
          <Link href="/sign-in" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-slate-700 hover:bg-slate-50">
            Demo akkaunt bilan kirish
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs text-slate-600">
          {SUBJECTS.map((s) => (
            <span key={s} className="bg-white border border-slate-200 rounded-full px-3 py-1">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card card-hover p-5">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="flex items-center justify-between border-t border-slate-200 py-6 text-xs text-slate-500">
        <span>© {new Date().getFullYear()} LabBoard</span>
        <span>O&apos;zbekiston uchun qurilmoqda 🇺🇿</span>
      </footer>
    </main>
  );
}
