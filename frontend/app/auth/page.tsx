"use client";
import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to chat
        router.push("/chat/new");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAuthSuccess = () => {
    router.push("/chat/new");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <AuthForm onSuccess={handleAuthSuccess} />
    </div>
  );
}
