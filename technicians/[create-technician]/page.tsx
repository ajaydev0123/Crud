"use client";
import TechniciansCreat from './create'
import React, { useState } from 'react';
import AuthCheck from '@/app/component/AuthCheck';
import { useSidebar } from "@/app/component/SidebarContext";

export default function TechniciansCreate() {
  const { isCollapsed } = useSidebar();

  return (
    <div className='main-container'>
      <div className={`right_section ${isCollapsed ? "w-full" : "w-[85%]"
        } pl-6 pr-8 ml-auto mt-[7rem] transition-all duration-300`}>
        <TechniciansCreat />
      </div>
    </div>
  );
}
