"use client";
// components/TechnicianTable.tsx
import React, { useState, useEffect, useRef } from 'react';
import TableActions from '../../component/action';
import CommonHeader from '../../component/commonHeader';
import { useRouter } from "next/navigation";
import SortableTable from '../../component/shorting'; // Import SortableTable
import Link from 'next/link';
import axios from 'axios';
import Swal from 'sweetalert2';
import Pagination from '../../component/pagination';
import Empty from '@/app/component/empty';
import Loader from '@/app/component/loader';
import { ExportToCsv } from 'export-to-csv-file';
import Breadcrumb from '@/app/component/breadcrumb';
import { useSidebar } from "@/app/component/SidebarContext";
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { Country, State } from 'country-state-city';
import TechnicianApprovalActions from '@/app/component/technicianApprovalActions';
import RejectReasonModal from '@/app/component/rejectReasonModal';



const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';  // ✅ Get the base URL here
interface Technicians {
  id: string;
  name: string;
  email: string;
  techType: string;
  deletedStatus?: boolean;
  Role: { name: string };
}
const TechnicianTable: React.FC = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>('id'); // Manage sorting column state
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Sorting direction state
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { isCollapsed } = useSidebar();
  const [pageSize, setPageSize] = useState(10);
  const [totalJobs, setTotalJobs] = useState(10);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  // Fetch technicians on success
  const handleRejectionSuccess = () => {
    fetchTechnicians(currentPage, searchTerm, pageSize);
  };

  const handleAccountStatusChanges = async (techId: number, accountStatus: boolean) => {
    const newStatus = accountStatus ? 'Active' : 'Inactive';

    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to change this account ${newStatus}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#383d71',
        cancelButtonColor: 'black',
        confirmButtonText: `Yes, ${newStatus}`,
      });

      if (!result.isConfirmed) return;

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      const response = await axios.post(
        `${apiUrl}/updateTechnicianAccountStatus`,
        {
          technicianId: techId,
          accountStatus: accountStatus,
        },
        config
      );

      if (response.data.status) {
        await Swal.fire({
          title: 'Success!',
          text: `Account status changed to ${newStatus}.`,
          icon: 'success',
          confirmButtonColor: '#383d71',
        });
        fetchTechnicians(currentPage, searchTerm, pageSize);
      } else {
        throw new Error(response.data.message || 'Account status update failed');
      }
    } catch (error) {
      console.error('Error updating account status:', error);
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Error updating account status',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };




  const fetchTechnicians = async (page = 1, query = '', limit = pageSize) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const roleType = localStorage.getItem('types') || "";
      if (!token) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Determine correct endpoint
      const endpoint = query.trim()
        ? `/api/technician?searchQuery=${encodeURIComponent(query)}&roleType=${encodeURIComponent(roleType)}`
        : `/api/technician?page=${page}&limit=${limit}`;


      const response = await fetch(endpoint, { method: 'GET', headers });
      if (response.status == 400) {
        localStorage.removeItem('token');
        router.push('/');
      }
      const data = await response.json();
      if (response.ok) {
        // Handle technicians array for both APIs correctly 

        const fetchedTechnicians: Technicians[] = query.trim()
          ? data.technicians || []
          : data.technician?.technicians || [];
        const filteredTechnicians = fetchedTechnicians.filter(technician => technician?.Role?.name !== "super admin");

        setTechnicians(filteredTechnicians);
        setTotalPages(data.technician?.totalPages || 1);
      } else {
        console.error('Error fetching technicians:',);
      }
    }
    catch (error) {
      // router.push('/');
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  // Unified useEffect to handle both search and pagination
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTechnicians(currentPage, searchTerm, pageSize);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [currentPage, searchTerm, pageSize]);


  const handleDeleteSuccess = (deletedId: string) => {
    setTechnicians((prev) => prev.filter((tech) => tech.id !== deletedId));
  };

  // Function to handle sorting logic
  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortBy === column) {
      direction = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    setSortDirection(direction);
    setSortBy(column);

    const sortedData = [...technicians].sort((a, b) => {
      let valueA: string | number, valueB: string | number;

      // Handle different column types
      switch (column) {
        case 'type':
          valueA = a.techType ? a.techType.toString().trim().toLowerCase() : '';
          valueB = b.techType ? b.techType.toString().trim().toLowerCase() : '';
          break;
        case 'name':
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          valueA = a.email?.toString().toLowerCase() || '';
          valueB = b.email?.toString().toLowerCase() || '';
          break;
        default:
          valueA = a[column]?.toString().toLowerCase() || '';
          valueB = b[column]?.toString().toLowerCase() || '';
      }

      // Perform comparison based on direction
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setTechnicians(sortedData);
  };



  const handlePageChange = (data: { selected: number }) => {
    console.log(`Going to page number ${data.selected + 1}`);  // react-paginate uses zero-based index
    setCurrentPage(data.selected + 1);
  };

  // Render row function for SortableTable
  const [statuses, setStatuses] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    const loadedStatuses: { [key: string]: string } = {};
    technicians.forEach((tech) => {
      const storedStatus = localStorage.getItem(`techStatus_${tech.id}`);
      if (storedStatus) {
        loadedStatuses[tech.id] = storedStatus;
      } else {
        loadedStatuses[tech.id] = tech.accountStatus ? "Approved" : "Accept";
      }
    });
    setStatuses(loadedStatuses);
  }, [technicians]);

  const handlePageSizeChange = (size: number) => {
    // Calculate the total number of pages based on the current totalJobs and the new pageSize
    const newTotalPages = Math.ceil(totalJobs / size);

    // If the current page is greater than the new total pages, reset it to the last page
    let newPage = currentPage;
    if (newPage > newTotalPages) {
      newPage = newTotalPages;
    }

    // Update the state with the new page size and set the current page accordingly
    setPageSize(size);
    setCurrentPage(newPage); // Set the current page to the last valid page
  };

  const renderRow = (tech: any) => {
    const status = statuses[tech.id] || "Accept";
    const isChecked = selectedIds.includes(tech.id);

    return (
      <tr key={tech.id}>
        <td key="checkbox">
          <label className="flex items-center cursor-pointer relative">
            <input
              type="checkbox"
              className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow bg-white hover:shadow-md border border-slate-300 checked:bg-[var(--foreground)] checked:border-[var(--foreground)]"
              checked={isChecked}
              onChange={() => handleCheckboxChange(tech.id)}
            />
            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-[10px] transform -translate-x-1/2 -translate-y-1/2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
            </span>
          </label>
        </td>
        <td>{tech.id}</td>
        <td>
          <div className="flex items-center gap-2">
            {tech?.image ? (
              <img src={tech.image} alt="" className="w-[40px] h-[40px] rounded-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-[40px] h-[40px] text-black-400 bg-gray-300 p-2 rounded-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            <Link href={`/technicians/view?technicianId=${tech.id}`} className='hover:underline capitalize'>
              {tech?.firstName} {tech?.lastName}
            </Link>

          </div>
        </td>

        <td>
          <a href={`mailto:${tech.email}`} style={{ color: '#383d71' }} className='hover:underline'>
            {tech.email}
          </a>
        </td>
        <td>
          <a href={`tel:${tech.phoneNumber}`} style={{ color: '#383d71' }} className='hover:underline'>
            {tech.phoneNumber}
          </a>
        </td>

        {/* <td>{tech.payRate}</td> */}

        <td
          onClick={() => {
            if (tech.isApproved === 'accept') {
              handleAccountStatusChanges(tech.id, !tech.accountStatus);
            }
          }} // Corrected here
          style={{ cursor: tech.isApproved || tech.accountStatus ? 'pointer' : 'not-allowed' }}
        >
          <span
            className={`badge ${tech.accountStatus
              ? 'badge-success bg-[#E6F9DD] text-[#1A932E] p-2 pl-4 pr-4 rounded shadow block text-center w-[100px]'
              : 'badge-error bg-[#FFE4E1] text-[#FF0000] p-2 pl-4 pr-4 rounded shadow block text-center w-[100px]'
              }`}
          >
            {tech.accountStatus ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>{tech.techType}</td>

        <td>
          <TableActions
            editRoute={`/technicians/create-technician?technicianId=${tech.id}&technician`}
            viewRoute={`/technicians/view?technicianId=${tech.id}`}
            deleteRoute={`/api/deleteTechnician`}  // Pass the correct endpoint
            itemId={tech.id}  // Pass the technician ID
            idKey="technicianId"
            userRole='Technician'
            onDeleteSuccess={() => handleDeleteSuccess(tech.id)}
          />
        </td>
      </tr>
    );
  }


  const downloadCSV = () => {
    const selectedTechnicians = technicians.filter(tech => selectedIds.includes(tech.id));
    if (selectedTechnicians.length === 0) {
      toast.error("Please select at least one technician to export.");
      return;
    }

    const csvOptions = {
      filename: 'IFS Technicians',
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalSeparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Technicians Data',
      useTextFile: false,
      useBom: true,
      useKeysAsHeaders: true, // Use object keys as headers
    };

    const csvExporter = new ExportToCsv(csvOptions);

    const formattedData = selectedTechnicians.map((tech) => {
      const countryName = Country.getCountryByCode(tech.country)?.name || tech.country;
      const stateName = State.getStateByCodeAndCountry(tech.state, tech.country)?.name || tech.state;
      return {
        Id: tech.id,
        Name: `${tech.firstName} ${tech.lastName}`,
        Email: tech.email,
        Address: tech.address,
        Type: tech.techType,
      };
    });

    // Ensure no headers are included in the data when downloading
    csvExporter.generateCsv(formattedData);
  };


  const handleImportCSV = (file: File) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const reader = new FileReader();

    reader.onload = async (e) => {
      let text = (e.target?.result as string)
        .replace(/^\uFEFF/, '') // Remove BOM
        .trimStart();

      const lines = text.split(/\r?\n/);

      // Remove any garbage lines at the start (empty rows, or headers like 'technician')
      while (lines.length > 0 && (lines[0].toLowerCase().includes("technician") || lines[0].trim() === "")) {
        lines.shift();
      }

      text = lines.join('\n');

      const manualHeaders = [
        'Id', 'Name', 'Email', 'Address', 'Type'
      ];

      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: async (result) => {
          const rows = result.data as string[][];

          // Log raw data for debugging
          console.log("Raw CSV data:", rows);

          // Remove the first row explicitly (header row) to avoid it being imported as data
          const cleanedData = rows.slice(1) // Skip the first row
            .map((row, index) => {
              const obj: any = {};

              // Create an object for each row
              manualHeaders.forEach((key, idx) => {
                let value: any = row[idx] ?? null;
                if (key === 'IsApproved' && (value === null || value === undefined)) {
                  // default value if missing
                  value = false;
                }
                if (typeof value === 'string') {
                  value = value.trim();
                  if (value === '') value = null;
                  const lower = value?.toLowerCase();
                  if (lower === 'true') value = true;
                  else if (lower === 'false') value = false;
                  else if (lower === 'null') value = null;
                }

                if (key.toLowerCase() === 'id' && !isNaN(Number(value))) {
                  value = parseInt(value, 10);
                }
                obj[key] = value;
              });

              return obj;
            })
            .filter((row) => {
              // Skip rows where any value exactly matches the header name (e.g., Id: 'Id')
              const isHeaderRow = Object.entries(row).some(([key, value]) => value === key);
              if (isHeaderRow) return false;

              // Skip rows that are null (e.g., rows with empty data)
              if (!row) return false;

              // Skip rows where all values are null/empty
              const allEmpty = Object.values(row).every(
                val => val === null || val === '' || val === undefined
              );
              if (allEmpty) return false;

              // Only keep rows with actual data
              return true;
            });

          // Log cleaned data
          console.log("✅ Final Cleaned Data:", cleanedData);

          try {
            const response = await axios.post(
              `/api/importTechnician`,
              { data: cleanedData },
              { headers }
            );
            toast.success('CSV Import Successful!');
            fetchTechnicians(currentPage, searchTerm, pageSize);
          } catch (error: unknown) {
            console.error('❌ Import failed:', error);
            toast.error('We could not find records matching the IDs you provided for updating. To ensure successful updates, please export the current data, compare the IDs in the exported file with the IDs in your import file, and make any necessary corrections');
          }

          setLoading(false);
        },
        error: (err: any) => {
          console.error('❌ CSV Parse error:', err);
          setLoading(false);
        },
      });
    };

    reader.readAsText(file);
  };



  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Select All
  const isAllSelected = technicians.length > 0 && selectedIds.length === technicians.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      const allIds = technicians.map(t => t.id); // Assuming each technician has an `id` field
      setSelectedIds(allIds);
    }
  };

  // Individual Row Checkbox
  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };


  return (
    <div className={` mx-auto mt-4 transition-all duration-300 ${isCollapsed ? 'w-full pl-[5rem]' : 'container'}`}>
      <Breadcrumb
        items={[
          { label: 'IFS Technicians', href: '/technicians/listing' }
        ]}
      />
      <CommonHeader heading="IFS Technicians" onPageSizeChange={handlePageSizeChange} onSearch={(term) => setSearchTerm(term)} onExport={downloadCSV} onImport={handleImportCSV} userRole='Technician' buttonLabel="Create Technician" buttonLink="/technicians/create-technician?technician" />
      <SortableTable
        headers={['', 'ID', 'Name', 'Email', 'Phone Number', 'Account Status', 'Type', 'Action']}
        data={technicians}
        renderRow={renderRow}
        sortBy={sortBy}
        sortDirection={sortDirection}
        handleSort={handleSort}
        loading={loading}
        renderHeaderCell={(header, index) => {
          if (index === 0) {
            return (
              <th key={index} className='w-[50px]'>
                <label className="flex items-center cursor-pointer relative">
                  <input
                    type="checkbox"
                    className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow bg-white hover:shadow-md border border-slate-300 checked:bg-[var(--foreground)] checked:border-[#fff]"

                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                  <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-[10px] transform -translate-x-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </span>
                </label>
              </th>
            );
          }
          const columnKey = header.toLowerCase().replace(' ', '');
          const sortableColumns = ['id', 'name', 'email', 'type'];

          return (
            <th
              key={index}
              className={`cursor-pointer ${index === 1 ? 'w-[60px]' : ''}`}
              onClick={() => sortableColumns.includes(columnKey) && handleSort(columnKey)} // Ensure the column is passed correctly
            >
              {header}
              {sortableColumns.includes(columnKey) && sortBy === columnKey && (
                <span className={`ml-2 ${sortDirection === 'asc' ? 'text-white' : 'text-white'}`}>
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </th>

          );
        }}
      />


      {technicians.length > 0 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}


      <RejectReasonModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        technicianId={selectedTechId}
        apiUrl={apiUrl}
        onSuccess={handleRejectionSuccess}
      />

    </div>


  );
};

export default TechnicianTable;
