import { useState } from "react"




export default function DetailModal({

    
  service,
  open,
  onClose,
}: {
  service: any
  open: boolean
  onClose: () => void
  
}) {
  if (!open || !service) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50">
      <div className="bg-[#1c1c1e] text-white p-6 rounded-xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-xl"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-2">{service.service_name}</h2>
        <p className="text-sm text-gray-300 mb-4">{service.description}</p>
        <p><span className="font-semibold">Price:</span> ${service.sold_price}</p>
        <p><span className="font-semibold">Created At:</span> {new Date(service.created_at).toLocaleString()}</p>
        {/* {service.created_by && (
          <p><span className="font-semibold">Created By:</span> {service.created_by}</p>
        )} */}
      </div>
    </div>
  )
}
