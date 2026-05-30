import Sidebar from './Sidebar'
import Navbar from './Navbar'

// Every admin/caregiver page wraps itself in this
// It gives the sidebar + top navbar + scrollable content area
const Layout = ({ title, children }) => {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar title={title} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout