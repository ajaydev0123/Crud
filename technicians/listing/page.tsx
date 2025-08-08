"use client";
import TechniciansListing from '../listing/technicians'
import React, { useState } from 'react';
import AuthCheck from '@/app/component/AuthCheck';
import { useSidebar } from "@/app/component/SidebarContext";

export default function Technicians() {
  const { isCollapsed } = useSidebar();
  return (
    <>
      <div className='main-container'>
        <div className={`right_section ${isCollapsed ? "w-full" : "w-[85%]"
          } pl-6 pr-8 ml-auto mt-[7rem] transition-all duration-300`}>
          <TechniciansListing />
        </div>
      </div>
    </>

  );
}
