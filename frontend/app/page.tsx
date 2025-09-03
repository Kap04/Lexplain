"use client"
import Link from "next/link";
import Image from "next/image";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { motion } from "framer-motion";
import { HyperText } from "@/components/magicui/hyper-text";
import { Span } from "next/dist/trace";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 items-center">

        {/* Text Section */}
        <div className="max-w-2xl col-span-1 flex flex-col justify-center h-full">
          <h1 className="text-7xl font-bold text-gray-900 leading-tight">
            <HyperText duration={1000} className="text-7xl font-bold">
              Demystrify
            </HyperText>
            {" "}Legal Documents with <SparklesText className="text-[#7C3AED]">AI</SparklesText>
          </h1>
          <p className="mt-6 text-2xl text-gray-600">
            Upload contracts, rental agreements, or terms of service and get
            simple plain-English summaries. Ask questions, clarify clauses,
            and make informed decisions.{" "}
            <span className="font-semibold text-gray-900">
              This is not legal advice.
            </span>
          </p>
          <div className="flex justify-end md:justify-end pr-20">
            <Link href="/auth">
              <InteractiveHoverButton className="mt-10 px-8 py-4 cursor-pointer bg-yellow-700 text-white text-xl rounded-lg hover:bg-yellow-800 transition">
                Get Started
              </InteractiveHoverButton>
            </Link>
          </div>
        </div>

        {/* Bot Image with fade effect */}
        <div className="flex justify-center pt-10 relative">
          <div className="relative">
            <Image
              src="/landing_page.png"
              alt="Lexplain Bot"
              width={500}
              height={500}
              className="rounded-lg"
            />
            <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-white via-transparent to-white opacity-25"></div>
            <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-t from-white via-transparent to-white opacity-25"></div>
          </div>

        </div>
      </div>
    </div>
  );
}


//Interactive hover button from magicUi