"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export function CheckoutButton({ orderId }: { orderId: string }) {
  const [message,setMessage]=useState(""); const [pending,setPending]=useState(false);
  async function checkout(){setPending(true);setMessage("");try{const response=await fetch("/api/payments/initialize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,installment:"deposit"})});const body=await response.json();if(!response.ok)throw new Error(body.error??"Unable to start checkout.");window.location.assign(body.authorizationUrl);}catch(error){setMessage(error instanceof Error?error.message:"Unable to start checkout.");setPending(false);}}
  return <div><button onClick={checkout} disabled={pending} className="w-full rounded-full bg-wine py-3 text-sm font-semibold text-white disabled:opacity-60">{pending?<span className="inline-flex items-center gap-2"><LoaderCircle size={15} className="animate-spin"/>Opening checkout</span>:"Pay deposit in NGN"}</button>{message&&<p className="mt-2 text-xs text-wine">{message}</p>}</div>;
}
