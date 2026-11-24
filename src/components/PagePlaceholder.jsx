export default function PagePlaceholder({ title, note }) {
  return (
    <div>
      <h1 className="text-4xl">{title}</h1>
      <div className="card mt-6 max-w-xl"><p className="font-black">Not built yet.</p><p className="mt-1 text-slate-600">{note}</p></div>
    </div>
  )
}
