"use client";
import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loading from '@/app/component/loader';
import Breadcrumb from '@/app/component/breadcrumb';
import { Country, State } from 'country-state-city';
import Swal from 'sweetalert2';
import axios from 'axios';
import TechnicianApprovalActions from '@/app/component/technicianApprovalActions';
import RejectReasonModal from '@/app/component/rejectReasonModal';
import { Link } from '@mui/material';
import Image from 'next/image';
import Eye from '../../../../public/eye.svg'
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
export default function ViewDetails() {
  const [technician, setTechnician] = useState<any>(null);  // Using `any` type for flexibility
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const handleRejectionSuccess = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const techId = searchParams.get('technicianId') || '';
    fetchTechnicianData(techId);

  };
  const fetchTechnicianData = async (technicianId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/viewTechnician`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ technicianId }),
      });

      const data = await response.json();

      if (response.ok) {
        setTechnician(data.technician);  // Set the technician data
      } else {
        toast.error(data.error || 'Error fetching technician data');
      }
    } catch (error) {
      toast.error('An error occurred while fetching technician data');
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const techId = searchParams.get('technicianId') || '';

    if (techId) {
      setIsEdit(true);  // Set to true if `technicianId` exists in the URL
      fetchTechnicianData(techId);
    } else {
      setIsEdit(false);
    }
  }, []);

  const getCountryName = (isoCode: string) => {
    if (!isoCode) return 'No country selected';
    const country = Country.getCountryByCode(isoCode);
    return country?.name || isoCode; // Fallback to ISO code if country not found
  };
  const getStateName = (countryCode: string, stateCode: string) => {
    if (!countryCode || !stateCode) return 'No state selected';
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    return state?.name || stateCode; // Fallback to code if name not found
  };


  const handleAccountStatusChange = async (techId: number, accountStatus: boolean) => {
    const newStatus = accountStatus ? 'Active' : 'Inactive';


    try {
      const token = localStorage.getItem('token');

      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };
      const searchParams = new URLSearchParams(window.location.search);
      const techId = searchParams.get('technicianId') || '';
      const response = await axios.post(
        `${apiUrl}/updateTechnicianAccountStatus`,
        {
          technicianId: techId,
          accountStatus: accountStatus,
        },
        config
      );


      if (techId) {
        fetchTechnicianData(techId);
      }


      if (response.data.status) {
        await Swal.fire({
          title: 'Success!',
          text: `Account status changed to ${newStatus}.`,
          icon: 'success',
          confirmButtonColor: '#383d71',
        });
      } else {
        throw new Error('Account status API failed');
      }
    } catch (error) {
      console.error('Error updating account status:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating account status.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleAccountStatusChanges = async (techId: number, accountStatus: boolean) => {
    const newStatus = accountStatus ? 'Active' : 'Inactive';

    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to ${newStatus} this technician?`,
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
        const searchParams = new URLSearchParams(window.location.search);
        const techId = searchParams.get('technicianId') || '';

        if (techId) {

          fetchTechnicianData(techId);
        }
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


  const handleApprovalChange = async (techId: number, isApproved: string, tech: any) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      await axios.post(
        `${apiUrl}/technicianActiveUnactiveAccount`,
        {
          technicianId: techId,
          isApproved: isApproved,
        },
        config
      );

    } catch (error) {
      console.error('Error updating approval status:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating approval status.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleChangeBothStatuses = async (tech: any) => {
    try {
      // Step 1: Check if payment info is missing (amountPercentage or simpleFlatRate or payRate)
      if ((!tech.amountPercentage && !tech.simpleFlatRate) || !tech.payRate || tech.payRate === "") {
        await Swal.fire({
          title: 'Missing Payment Info',
          text: 'Please enter payrate for this technician.',
          icon: 'info',
          confirmButtonColor: '#383d71',
          confirmButtonText: 'OK',
        });
        return;
      }

      // Determine the new status (toggle between 'accept' and 'reject')
      const newApprovalStatus = tech.isApproved === 'accept' ? 'cancel' : 'accept';
      const newAccountStatus = newApprovalStatus === 'accept'; // true for active, false for inactive

      const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to ${newApprovalStatus} this technician?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#383d71',
        cancelButtonColor: 'black',
        confirmButtonText: `Yes, ${newApprovalStatus}`,
      });

      if (result.isConfirmed) {
        // Update account status first
        await handleAccountStatusChange(tech.id, newAccountStatus);

        // Then update approval status
        await handleApprovalChange(tech.id, newApprovalStatus, tech);

        // Refresh the list
        const searchParams = new URLSearchParams(window.location.search);
        const techId = searchParams.get('technicianId') || '';

        if (techId) {

          fetchTechnicianData(techId);
        }
      }

    } catch (error) {
      console.error('Error updating both statuses:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating technician statuses.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };


  if (!technician) {
    return <div><Loading /></div>;
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'IFS Technicians', href: '/technicians/listing' },
          { label: 'View Detail', href: '/jobs/job-group/listing' }
        ]}
      />

      <div className='mx-auto'>
        <div className='rounded-lg shadow bg-white mb-5'>
          <div className='flex gap-4 p-4'>
            {technician?.image ? (
              <img
                onClick={() => setPreviewImage(technician.image)}
                src={technician?.image}
                alt='Technician Tax Form'
                className="w-[100px] h-[100px] rounded shadow-lg cursor-pointer object-cover"
              />
            ) : (

              <div
                className="w-[100px] h-[100px] rounded bg-[#383D71] flex items-center justify-center text-white font-bold text-2xl"
              >
                {technician.firstName?.charAt(0)?.toUpperCase() || 'T'}
              </div>
            )}


            <div>
              <h2 className='text-lg font-bold capitalize'>{technician?.firstName} {technician?.lastName}</h2>
              <p className='flex gap-2 items-center'>
                <svg width="20" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="view__detail">
                  <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="#5B5B99" strokeWidth="1.2" />
                  <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="#5B5B99" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <a href={`mailto:${technician?.email}`} className='hover:underline'>
                  {technician?.email}
                </a></p>

              <p className='flex gap-2 items-center'>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" className="view__detail"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {technician.address ? technician.address.replace(/^,+|,+$/g, '').replace(/\s+/g, ' ').trim() : 'N/A'}
              </p>
              <p className='flex gap-2 items-center'>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="view__detail" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="2" width="10" height="16" rx="2" stroke="#5B5B99" strokeWidth="1.5" />
                  <rect x="8" y="3.5" width="4" height="1" fill="#5B5B99" />
                  <circle cx="7" cy="7" r="0.8" fill="#5B5B99" />
                  <circle cx="10" cy="7" r="0.8" fill="#5B5B99" />
                  <circle cx="13" cy="7" r="0.8" fill="#5B5B99" />

                  <circle cx="7" cy="10" r="0.8" fill="#5B5B99" />
                  <circle cx="10" cy="10" r="0.8" fill="#5B5B99" />
                  <circle cx="13" cy="10" r="0.8" fill="#5B5B99" />

                  <circle cx="7" cy="13" r="0.8" fill="#5B5B99" />
                  <circle cx="10" cy="13" r="0.8" fill="#5B5B99" />
                  <circle cx="13" cy="13" r="0.8" fill="#5B5B99" />
                </svg>
                <a href={`tel:${technician?.phoneNumber}`} className='hover:underline'>
                  {technician?.phoneNumber}
                </a></p>
            </div>
          </div>
        </div>
        <div className="bg-blue rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2 pt-4 pl-6 border-b border-[#ccc] pb-3">Technician Details</h2>

          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Left Section */}
            <div className='shadow-lg p-5 bg-white rounded'>

              <p className='border-b border-gray-500 mb-3 pb-2'>
                <strong className='w-[200px] inline-block'>Secondary Phone:</strong>
                {technician?.secondaryContactName ? (
                  <a href={`tel:${technician?.secondaryContactName}`} className='hover:underline'>

                    {technician.secondaryContactName}
                  </a>
                ) : (
                  <span className="text-sm text-black-500">N/A</span>
                )}
              </p>
              <p className='mb-2 border-b border-gray-500 mb-3 pb-2'>
                <strong className='w-[200px] inline-block'>Secondary Email:</strong>
                {technician?.secondaryEmail ? (
                  <a href={`mailto:${technician?.secondaryEmail}`} className='hover:underline'>

                    {technician.secondaryEmail}
                  </a>
                ) : (
                  <span className="text-sm text-black-500">N/A</span>
                )}
              </p>

              <p className='mb-2 border-b border-gray-500 mb-3 pb-2'>
                <strong className='w-[200px] inline-block'>Type:</strong>
                {technician.techType}
              </p>


            </div>

            {/* Right Section */}
            <div className='shadow-lg p-5 bg-white rounded'>


              <p className='mb-2 border-b border-gray-500 mb-3 pb-2'><strong className='w-[200px] inline-block'>Date:</strong>{new Date(technician.createdAt).toLocaleDateString('en-GB')} </p>
              <div className='mb-2 flex border-b border-gray-500 mb-3 pb-3 items-center'><strong className='w-[200px] inline-block'>Account Status:</strong>
                <div
                  onClick={() => {
                    if (technician.isApproved === 'accept') {
                      handleAccountStatusChanges(technician.id, !technician.accountStatus);
                    }
                  }} // Corrected here
                  style={{ cursor: technician.isApproved || technician.accountStatus ? 'pointer' : 'not-allowed' }}
                >
                  <span
                    className={`badge ${technician.accountStatus
                      ? 'badge-success bg-[#E6F9DD] text-[#1A932E] p-2 pl-4 pr-4 rounded shadow block text-center w-[100px]'
                      : 'badge-error bg-[#FFE4E1] text-[#FF0000] p-2 pl-4 pr-4 rounded shadow block text-center w-[100px]'
                      }`}
                  >
                    {technician.accountStatus ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className='flex items-center'>
                <strong className='w-[200px] inline-block'>Tax Form:</strong>

                {technician?.taxForms && technician.taxForms.length > 0 ? (
                  <div className="mt-1 block mb-2 flex gap-2 items-center">
                    {technician.taxForms.map((form: any, index: number) => {
                      const isPDF = form.endsWith('.pdf');

                      return (
                        <div key={index} className="relative flex items-center gap-2">
                          {isPDF ? (
                            <button
                              onClick={() => window.open(form, '_blank')}
                              className="flex items-center gap-2 bg-gray-200 px-2 py-1 rounded shadow cursor-pointer"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="orange" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 2H14L20 8V22H6V2Z" stroke="orange" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M14 2V8H20" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-sm text-black-600">View PDF</span>
                            </button>
                          ) : (
                            <img
                              onClick={() => setPreviewImage(form)}
                              src={form}
                              alt={`Technician Tax Form ${index + 1}`}
                              className="w-[50px] h-[50px] rounded-full bg-orange-500 p-1 shadow-lg cursor-pointer"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-black-500">N/A</span>
                )}
              </div>


            </div>
          </div>


          <h3 className='bg-white text-[#000] p-3 font-bold pt-3'>Job List</h3>
          <div className="overflow-x-auto bg-white">
            <table className="table w-full table-fixed">
              <thead className=" ">
                <tr>
                  <th scope="col">
                    Job Id
                  </th>
                  <th scope="col">
                    Job Name
                  </th>
                  <th scope="col">
                    Estimated Cost
                  </th>

                  <th scope="col">
                    Tech Rate
                  </th>
                  <th scope="col">
                    R/I/R/R
                  </th>
                  <th scope="col">
                    Notes
                  </th>
                  <th scope="col">
                    Start Date
                  </th>
                  <th scope="col">
                    End Date
                  </th>
                  <th scope='col'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {technician?.jobs && technician?.jobs?.length > 0 ? (
                  technician?.jobs.map((jobs: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{jobs.id || '-'}</td>
                      <td className="px-6 py-4 capitalize">{jobs.jobName || '-'}</td>
                      <td className="px-6 py-4">
                        {jobs.estimatedCost ? `$${jobs.estimatedCost}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {jobs.UserJob?.techFlatRate ? `$${jobs.UserJob.techFlatRate}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {jobs.UserJob?.rRate ? `$${jobs.UserJob.rRate}` : '-'}
                      </td>
                      <td className="px-6 py-4">{jobs.notes || '-'}</td>
                      <td className="px-6 py-4">
                        {jobs.startDate ? new Date(jobs.startDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {jobs.endDate ? new Date(jobs.endDate).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <Link href={`/jobs/view?jobId=${jobs.id}`} >
                          <Image alt='eye' src={Eye} className='w-[16px] ' data-tooltip-id="view"
                            data-tooltip-content="View" />
                        </Link>
                        <Tooltip id="view" place="top" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">
                      No jobs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


          <h3 className='bg-white text-[#000] p-3 font-bold pt-3'>Vehicle List</h3>
          <div className="overflow-x-auto bg-white">
            <table className="table w-full table-fixed">
              <thead className=" ">
                <tr>
                  <th scope="col">
                    Job Name
                  </th>
                  <th scope="col">
                    VIN
                  </th>
                  <th scope="col">
                    Make
                  </th>
                  <th scope="col">
                    Model
                  </th>
                  <th scope="col">
                    Model Year
                  </th>
                  <th scope="col">
                    Description
                  </th>
                  <th scope="col">
                    Notes
                  </th>
                  <th scope="col">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {technician?.jobs?.some((job: any) => Array.isArray(job.vehicles) && job.vehicles.length > 0) ? (
                  technician.jobs.map((job: any, jobIndex: number) =>
                    job.vehicles?.map((vehicle: any, vehicleIndex: number) => (
                      <tr key={`${jobIndex}-${vehicleIndex}`}>
                        <td className="px-6 py-4">
                          {vehicle.jobName || '-'}
                        </td>
                        <td className="px-6 py-4 capitalize">
                          {vehicle.vin || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {vehicle.make || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {vehicle.model || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {vehicle.modelYear || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {Array.isArray(vehicle.jobDescription) &&
                            vehicle.jobDescription.some((desc: string) => desc.trim() !== '')
                            ? vehicle.jobDescription.join(', ')
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {vehicle.notes && vehicle.notes.trim() !== '' ? vehicle.notes : '-'}
                        </td>
                        <td>
                          <Link href={`/vehicle/view?vehicleId=${vehicle.id}`} >
                            <Image alt='eye' src={Eye} className='w-[16px] ' data-tooltip-id="view"
                              data-tooltip-content="View" />
                          </Link>
                          <Tooltip id="view" place="top" />
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-500">
                      No vehicle found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <RejectReasonModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          technicianId={selectedTechId}
          apiUrl={apiUrl}
          onSuccess={handleRejectionSuccess}
        />
        <ToastContainer />

        {previewImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            onClick={() => setPreviewImage(null)} // Close on backdrop click
          >
            <img src={previewImage} alt="Preview" className="max-w-[90%] max-h-[90%] rounded shadow-lg" />
          </div>
        )}
      </div>
    </>
  );
}
