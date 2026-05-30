const Navbar = ({ title }) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6">
      <h1 className="text-slate-800 font-semibold text-base">{title}</h1>
    </header>
  )
}

export default Navbar