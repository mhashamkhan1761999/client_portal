'use client'

import React, { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ReactNode } from 'react'// if using this modal
import Image from 'next/image'  
import ClientModal from '../clients/ClientModal' // ✅ Make sure the path is correct
import supabase from '@/lib/supabaseClient'
import { Dialog, Transition } from '@headlessui/react'
import { useUser } from '@supabase/auth-helpers-react'



// import logo from '../../public/logo.svg' // Adjust the path as necessary




const menuItems = [
  { name: 'Dashboard', path: '/dashboard' },  
  { name: 'All Clients', path: '/all-clients' },
  { name: 'Completed', path: '/clients/completed' },
  { name: 'Settings', path: '/settings' },
  { name: 'User Managment', path: '/admin/users' },

]


export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  


  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  
  const [showAddClient, setShowAddClient] = useState(false) // ✅ moved inside component
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      const { data: authUserData } = await supabase.auth.getUser()
      const userId = authUserData?.user?.id

      if (authError || !user?.id) {
        console.error('No authenticated user found', authError)
        return
      }

      // Now fetch from your custom users table using this ID
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching custom user:', error)
      } else {
        setCurrentUser(data)
      }
    }

    fetchCurrentUser()
  }, [])


  return (
    
    <div className="flex h-screen bg-[#111111] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1c1c1e] p-6 border-r border-[#2a2a2a] flex flex-col justify-between">
        {/* Top Section */}
        <div>
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/white-logo.png"
              alt="MetaMalistic Logo"
              width={250}
              height={40}
              priority
            />
          </div>

          <div className="mb-8 flex items-center gap-3 justify-center">
            <div className="flex flex-col items-center mt-6 space-y-2">
                {currentUser && (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-yellow-400 text-black font-bold rounded-full flex items-center justify-center text-xl uppercase">
                      {currentUser.name?.charAt(0)}
                    </div>
                    <div className="mt-1 text-sm text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentUser.role}
                    </div>
                  </div>
                )}
              </div>
          </div>


          {/* Navigation */}
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
        </div>

        {/* Bottom Section: Logout Button */}
        <button
            onClick={() => setShowLogoutModal(true)}
            className="mt-6 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            Logout
          </button>
      </aside>

      {/* Main Content Scrollable */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>

      {/* Client Modal */}
      {showAddClient && (
        <ClientModal
          open={showAddClient}
          onClose={() => setShowAddClient(false)}
          onSaved={() => setShowAddClient(false)}
          currentUser={undefined}
        />
      )}

      {showLogoutModal && (
      <Transition appear show={showLogoutModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowLogoutModal(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="fixed inset-0 flex items-center justify-center">
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-[#1c1c1e] p-6 border border-gray-700 text-white">
              <Dialog.Title className="text-lg font-semibold mb-2">Confirm Logout</Dialog.Title>
              <p className="text-gray-400 mb-4">Are you sure you want to log out?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                >
                  Yes, Logout
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    )}
    </div>
    

    

    
  )

      


  
}


