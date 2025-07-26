import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import Image from 'next/image'

// import logo from '../../public/logo.svg' // Adjust the path as necessary

const menuItems = [
  { name: 'Dashboard', path: '/dashboard' },  
  { name: 'Add New Client', path: '/clients/add' },
  { name: 'Update Client Information', path: '/clients/update' },
  
  { name: 'All Clients', path: '/clients' },
  { name: 'Completed', path: '/completed' },
  { name: 'In Progress', path: '/in-progress' },
  { name: 'Unresponsive', path: '/unresponsive' },
  { name: 'Settings', path: '/settings' },
]


export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      {/* Sidebar */}
      <aside className="w-80 bg-[#1c1c1e] p-6 border-r border-[#2a2a2a]">
         <div className="mb-10">
          {/* Replace with your actual logo */}
          <Image src="/images/white-logo.png" alt="MetaMalistic" width={250} height={40} />
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`block px-4 py-2 rounded-lg ${
                router.pathname === item.path
                  ? 'bg-[#c29a4b] text-black font-semibold'
                  : 'hover:bg-[#2a2a2a] text-gray-300'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
