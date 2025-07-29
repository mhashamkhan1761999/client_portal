'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ReactNode } from 'react'// if using this modal
import Image from 'next/image'  
import ClientModal from '../../components/ClientModal' // ✅ Make sure the path is correct


// import logo from '../../public/logo.svg' // Adjust the path as necessary




const menuItems = [
  { name: 'Dashboard', path: '/dashboard' },  
  { name: 'All Clients', path: '/all-clients' },
  { name: 'Completed', path: '/clients/completed' },
  { name: 'In Progress', path: '/in-progress' },
  { name: 'Unresponsive', path: '/unresponsive' },
  { name: 'Settings', path: '/settings' },
]


export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [showAddClient, setShowAddClient] = useState(false) // ✅ moved inside component

  return (
    <div className="flex min-h-screen bg-[#111111] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1c1c1e] p-6 border-r border-[#2a2a2a]">
        <div className="mb-8 flex justify-center">
        <Image
          src="/images/white-logo.png" // Update the path if your logo is elsewhere
          alt="MetaMalistic Logo"
          width={250}
          height={40}
          priority
        />
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

        {/* Add Client Button */}
        <button
          onClick={() => setShowAddClient(true)}
          className="mt-6 w-full bg-[#c29a4b] text-black py-2 px-4 rounded-lg font-semibold"
        >
          + Add Client
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>

      {/* Client Modal */}
      {showAddClient && (
        <ClientModal
          open={showAddClient}
          onClose={() => setShowAddClient(false)}
          onSaved={() => setShowAddClient(false)} currentUser={undefined}        />
      )}
    </div>
  )
}
