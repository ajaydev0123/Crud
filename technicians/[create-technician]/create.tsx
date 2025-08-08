"use client";
import React, { useState, useEffect } from 'react';
import { Country, State } from 'country-state-city';
import { ICountry, IState } from 'country-state-city';
import toast from 'react-hot-toast';
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Loader from '@/app/component/loader';
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import Share from '../../../../public/share.png';
import Image from 'next/image';
import Eye from "../../../../public/eye.svg";
import EyeOff from '../../../../public/eye-off.svg';
import Breadcrumb from '@/app/component/breadcrumb';
import Swal from "sweetalert2";
import { Checkbox, FormControlLabel, FormHelperText, Input, ListItemText } from '@mui/material';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete';
import { SingleValue, ActionMeta } from 'react-select';

interface TechnicianForm {
  id?: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phoneNumber: string;
  secondaryContactName: string;
  email: string;
  address: string;
  secondaryEmail: string;
  password: string;
  confirmPassword: string;
  techType: string;
  taxForms: File[];
  image: File | null;
  businessLogo: File | null;
  role: string;
  types: string;
  agreeTerms: string;

}

interface PlaceType {
  place_id: string;
  description: string;
  // Add other properties you might need from Google Places
}

interface AddressValue {
  label: string;
  value: PlaceType;
}

type GooglePlacesOption = {
  label: string;
  value: {
    place_id: string;
    description: string;
  };
};

type NullableGooglePlacesOption = SingleValue<GooglePlacesOption>;

export default function Technicians() {
  const router = useRouter();
  const pathname = usePathname();
  // const { id } = router.query;
  // console.log(id,'dddddddddddddd')
  const [submitting, setSubmitting] = useState<boolean>(false);  // ✅ Track form submission state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isEdit, setIsEdit] = useState<boolean>(false); // To differentiate between create and edit 
  const [state, setStates] = useState<IState[]>([]);
  const [domain, setDomain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConformPassword, setShowConformPassword] = useState(false);
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState<any[]>([]);
  const isSingleTechnician = searchParams?.has('singletechnician') ?? false;
  const isTechnician = searchParams?.has('technician') ?? false;
  const isManager = searchParams?.has('manager') ?? false;
  const vehicleTypes = ['SUV', 'Sedan', 'Truck', 'Van', 'Motorcycle'];
  const [userType, setUserType] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [simpleFlatRateAll, setSimpleFlatRateAll] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [address, setAddressValue] = useState<NullableGooglePlacesOption>(null);
  const [formData, setFormData] = useState<TechnicianForm>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    address: '',
    secondaryContactName: '',
    secondaryEmail: '',
    password: '',
    confirmPassword: '',
    techType: 'technician',
    taxForms: [],
    image: null,
    businessLogo: null,
    businessName: '',
    role: '',
    types: '',
    agreeTerms: 'true',
  });

  const handleAddressSelect = async (selectedAddress: AddressValue) => {
    if (!selectedAddress) return;

    setAddressValue(selectedAddress);

    try {
      const results = await geocodeByAddress(selectedAddress.label);
      const addressComponents = results[0].address_components;

      let street = '', city = '', state = '', country = '', zip = '';

      addressComponents.forEach(component => {
        if (component.types.includes('street_number') || component.types.includes('route')) {
          street += component.long_name + ' ';
        }
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('country')) {
          country = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          zip = component.long_name;
        }
      });

      const fullAddress = `${street.trim()}, ${city}, ${state}, ${country}, ${zip}`;
      // Update form data with the full address
      setFormData(prev => ({
        ...prev,
        address: fullAddress,  // Store combined address here
      }));

      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.address;
        delete newErrors.city;
        delete newErrors.state;
        delete newErrors.zipCode;
        return newErrors;
      });

    } catch (error) {
      console.error('Error fetching address details:', error);
      toast.error('Failed to process address details');
    }
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

      if (response.status == 400) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      const data = await response.json();

      // Process the address
      let addressParts = [];
      if (data.technician.address) {
        // Split the address string and filter out empty parts
        addressParts = data.technician.address.split(',').map((part: any) => part.trim()).filter((part: any) => part !== '');
      }

      // Construct the full address for display
      const fullAddress = addressParts.join(', ');
      // const matchedRole = roles.find(role => role.id === data.technician.roleId);
      // const roleName = matchedRole?.name || '';

      if (response.ok) {

        if (fullAddress) {
          const addressValue: AddressValue = {
            label: fullAddress,
            value: {
              place_id: `existing-address-${Date.now()}`,
              description: fullAddress
            }
          };
          setAddressValue(addressValue);
        }
        setFormData(prev => ({
          ...prev,
          ...data.technician,
          id: technicianId,
          password: '',
          taxForms: data.technician.taxForms || [],
          address: fullAddress,
          role: data.technician.Role.name || '',
          techType: data.technician.techType || '',
          types: data.technician.types || '',
        }));
      }
    } catch (error) {
      toast.error('An error occurred while fetching technician data');
    }
  };
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const techId = searchParams.get('technicianId') || '';
      if (techId) {
        setIsEdit(true);  // Set to true if `technicianId` exists in the URL
        fetchTechnicianData(techId);
      } else {
        setIsEdit(false); // Set to false if `technicianId` is missing
      }
    }
  }, []);



  const handleSelectChange = (
    event: SelectChangeEvent<string>,
    child: React.ReactNode
  ) => {
    const name = event.target.name;
    const value = event.target.value;

    if (name === "role") {
      const selectedRole = roles.find((role) => role.name === value);
      setSelectedRole(selectedRole);
      setFormData((prev) => ({
        ...prev,
        role: value,
        types: selectedRole?.type || "",
      }));

      const newQuery = new URLSearchParams(Array.from(searchParams!.entries()));

      // Remove ?singletechnician if "technician" is selected
      if (value === 'technician') {
        newQuery.delete('singletechnician');
        newQuery.delete('manager');

      }
      if (value === 'singletechnician') {
        newQuery.delete('technician');
        newQuery.delete('manager');

      }
      if (value === 'manager') {
        newQuery.delete('technician');
        newQuery.delete('singletechnician');

      }

      // Add ?singletechnician if "singletechnician" is selected
      if (value === 'singletechnician') {
        newQuery.set('singletechnician', 'true'); // or use empty string if preferred
      }
      if (value === 'technician') {
        newQuery.set('technician', 'true'); // or use empty string if preferred
      }
      if (value === 'manager') {
        newQuery.set('manager', 'true'); // or use empty string if preferred
      }

      router.replace(`${pathname}?${newQuery.toString()}`);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };


  const handleMultipleVehicleTypeChange = (event: SelectChangeEvent<string[]>) => {
    let value = event.target.value;
    if (typeof value === 'string') {
      value = value.split(','); // fallback if MUI returns string
    }
    setFormData(prev => ({
      ...prev,
      payVehicleType: value,  // should be string[]
    }));
  };



  const handleChange: React.ChangeEventHandler<
    HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value,
    };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (name === 'secondaryContactName') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 10) return;
    }

    if (name === "secondaryEmail") {
      const isValidEmail = emailPattern.test(value);
      setErrors((prev) => ({
        ...prev,
        emailError: isValidEmail ? '' : 'Please enter a valid email address',
      }));
    }

    let shouldUpdate = true;

    if (name === 'amountPercentage') {
      const num = Number(value);

      if (isNaN(num) || num < 0 || num > 100) {
        shouldUpdate = false;
        setErrors((prev) => ({
          ...prev,
          amountPercentage: 'Value must be between 0 and 100',
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          amountPercentage: '',
        }));
      }
    }
    if (name === 'simpleFlatRate') {
      const valid = /^\d{0,5}(\.\d{0,2})?$/.test(value);
      shouldUpdate = valid;
    }

    if (shouldUpdate) {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (shouldUpdate) {
      setFormData(updatedFormData);
    }
    if (name === 'password' || name === 'confirmPassword') {
      if (
        updatedFormData.confirmPassword &&
        updatedFormData.confirmPassword !== updatedFormData.password
      ) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match',
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.confirmPassword;
          return newErrors;
        });
      }
    }



    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
    // Update formData confirm password value if you store it
    setFormData(prev => ({ ...prev, confirmPassword }));
    validateConfirmPassword(confirmPassword);
  };
  useEffect(() => {
    if (formData.confirmPassword) {
      validateConfirmPassword(formData.confirmPassword);
    }
  }, [formData.password]);

  const validateConfirmPassword = (confirmPassword: string) => {
    if (confirmPassword !== formData.password) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match',
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return newErrors;
      });
    }
  };


  function compressImage(file: any, maxWidth: number, maxHeight: number, quality: number) {
    return new Promise((resolve, reject) => {
      const image = new window.Image();
      image.src = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Canvas 2D context is not supported."));
          return;
        }

        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);

        canvas.toBlob(blob => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };

      image.onerror = () => reject(new Error('Image loading error'));
    });
  }

  // To handle the image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const maxWidth = 800; // Maximum image width
    const maxHeight = 600; // Maximum image height
    const quality = 0.7; // Compression quality

    const imageFiles = files.filter(file => file instanceof File && file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file instanceof File && file.type === 'application/pdf');


    try {
      // Compress image files
      const compressedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const compressedBlob = await compressImage(file, maxWidth, maxHeight, quality);

          if (!(compressedBlob instanceof Blob)) {
            throw new Error("Compression failed: Not a Blob");
          }

          // Convert Blob back to File
          return new File([compressedBlob], file.name, { type: file.type });
        })
      );

      // Combine compressed images and PDFs into one array
      const allFiles = [...compressedImages, ...pdfFiles];

      // Update state with new files
      setFormData((prev: any) => ({ ...prev, taxForms: [...(prev.taxForms || []), ...allFiles] }));
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to process files.');
    }
  };

  React.useEffect(() => {
    const type = localStorage.getItem('types');
    setUserType(type);
  });


  const handleRemoveFile = async (index: number, imageType: 'taxForm' | 'profileImage' | 'businessLogo') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const token = localStorage.getItem('token');
      let userId = '';
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        userId = searchParams.get('technicianId') || '';
      }

      let imageToRemoveUrl: string | null = null;

      // Get the image url to delete based on type and index
      if (imageType === 'taxForm' && formData.taxForms) {
        const file = formData.taxForms[index];
        if (typeof file === 'string') {
          imageToRemoveUrl = file;
        }
      } else if (imageType === 'profileImage') {
        if (typeof formData.image === 'string') {
          imageToRemoveUrl = formData.image;
        }
      } else if (imageType === 'businessLogo') {
        if (typeof formData.businessLogo === 'string') {
          imageToRemoveUrl = formData.businessLogo;
        }
      }

      if (!imageToRemoveUrl) {
        // No URL found, just remove locally
        removeLocalImage(index, imageType);
        return;
      }

      // Prepare payload as per your requirement
      let payload: any = {
        userId: userId ? parseInt(userId) : undefined,
      };

      if (imageType === 'taxForm') {
        payload.taxFormsToDelete = [imageToRemoveUrl];
        payload.imageToDelete = null;
      } else {
        payload.taxFormsToDelete = [];
        payload.imageToDelete = imageToRemoveUrl;
      }

      // Call API to delete
      const response = await fetch(`${apiUrl}/deleteTechnicianImages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to delete image.');
        return;
      }

      toast.success('Image deleted successfully.');

      // Remove image locally after successful deletion
      removeLocalImage(index, imageType);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('An error occurred while deleting the image.');
    }
  };

  const removeLocalImage = (index: number, imageType: 'taxForm' | 'profileImage' | 'businessLogo') => {
    if (imageType === 'taxForm' && formData.taxForms) {
      const newTaxForms = formData.taxForms.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, taxForms: newTaxForms }));
    } else if (imageType === 'profileImage') {
      setFormData(prev => ({ ...prev, image: null }));
    } else if (imageType === 'businessLogo') {
      setFormData(prev => ({ ...prev, businessLogo: null }));
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.phoneNumber?.trim()) newErrors.phoneNumber = 'Phone Number is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (!isEdit) {
      if (!formData.password?.trim()) newErrors.password = 'Password is required';
    }

    if (formData.secondaryEmail && !emailPattern.test(formData.secondaryEmail)) {
      newErrors.secondaryEmail = 'Please enter a valid email address';
    }


    if (formData.password && formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Enter confirm password';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors); // Replace all errors with new ones
      console.log(errors, 'sadasd')
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    const formDataObj = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'confirmPassword') {
        // Skip confirmPassword, do not append to FormData
        return;
      }
      if (key === 'taxForms' && formData[key]) {
        formData[key].forEach(file => {
          formDataObj.append('taxForms', file); // Append each file to FormData
        });
      }



      else if (key !== 'image') {
        formDataObj.append(key, String(formData[key as keyof TechnicianForm])); // Convert all values to string
      }
    });
    if (formData.image) {
      formDataObj.append('image', formData.image);
    }
    if (formData.businessLogo) {
      formDataObj.append('businessLogo', formData.businessLogo);

    }
    const types = localStorage.getItem('types');
    if (types) {
      formDataObj.set('types', formData.types || ''); // `set` replaces if exists, preventing duplicates
    } else {
      toast.error("User types not found!");
      return;
    }
    if (isEdit && formData.id) {
      formDataObj.append('technicianId', formData.id);  // Append the ID correctly
    }
    // Create headers object
    const headers: Record<string, string> = {};
    // If token exists, add it to Authorization header

    if (isEdit) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    formDataObj.append("createdBy", "admin");
    console.log('techType before appending:', formData.techType);


    try {
      setSubmitting(true);

      const response = await fetch(`${isEdit ? `${apiUrl}/updateTechnician` : `${apiUrl}/register`}`, {
        method: 'POST',
        body: formDataObj, // Send the FormData object without setting Content-Type header
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const apiErrors: { [key: string]: string } = {};

        // Handle different error response formats
        if (data.message) {
          // Check if the error message indicates email or phone number issues
          if (data.message.toLowerCase().includes('email')) {
            apiErrors.email = data.message;
          } else if (data.message.toLowerCase().includes('phone')) {
            apiErrors.phoneNumber = data.message;
          } else if (data.error.toLowerCase().includes('password')) {
            apiErrors.password = data.message;
          } else {
            // For other general errors
            // toast.error(data.error);
          }
        }

        // Also check if there are field-specific errors in data.errors
        if (data.message && typeof data.message === 'object') {
          Object.entries(data.message).forEach(([key, value]) => {
            if (key === 'phoneNumber' || key === 'email' || key === 'password') {
              apiErrors[key] = String(value);
            }
          });
        }

        // Update the errors state if we found field-specific errors
        if (Object.keys(apiErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...apiErrors }));
        } else if (data.error && Object.keys(apiErrors).length === 0) {
          // Show general error toast if no field-specific errors were found
          toast.error(data.error);
        }
      } else {
        if (isSingleTechnician) {
          toast.success('Single technician added successfully');
        } else if (searchParams!.has('manager')) {
          toast.success('Manager added successfully');
        } else {
          toast.success('Technician added successfully');
        }
        if (searchParams!.has('singletechnician')) {
          router.push('/single-technicians/listing');
        } else if (searchParams!.has('manager')) {
          router.push('/manager/listing');
        } else {
          router.push('/technicians/listing');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);  // ✅ Hide loader when done
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxWidth = 800; // Maximum image width
    const maxHeight = 600; // Maximum image height
    const quality = 0.7; // Compression quality

    try {
      const compressedFile = await compressImage(file, maxWidth, maxHeight, quality);
      setFormData((prev: any) => ({ ...prev, image: compressedFile }));
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to compress image.');
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxWidth = 800; // Maximum image width
    const maxHeight = 600; // Maximum image height
    const quality = 0.7; // Compression quality

    try {
      const compressedFile = await compressImage(file, maxWidth, maxHeight, quality);
      setFormData((prev: any) => ({ ...prev, businessLogo: compressedFile }));
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to compress image.');
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev: any) => ({ ...prev, image: null }));
  };
  const handleRemoveImageLogo = () => {
    setFormData((prev: any) => ({ ...prev, businessLogo: null }));
  };

  const getNationalNumber = (digitsOnly: string, fullNumber: string): string => {
    try {
      const parsed = parsePhoneNumberFromString(fullNumber);
      if (parsed) {
        return digitsOnly.startsWith(parsed.countryCallingCode)
          ? digitsOnly.slice(parsed.countryCallingCode.length)
          : digitsOnly;
      }
      return digitsOnly;
    } catch {
      return digitsOnly;
    }
  };

  const handlePhoneChange = (value: string | undefined) => {
    if (!value) {
      setFormData(prev => ({
        ...prev,
        phoneNumber: ''
      }));
      setErrors(prev => ({ ...prev, phoneNumber: 'Phone number is required' }));
      return;
    }

    const digitsOnly = value.replace(/\D/g, '');
    const nationalNumber = getNationalNumber(digitsOnly, value);

    // Stop if national number exceeds 10 digits
    if (nationalNumber.length > 10) {
      return;
    }

    // Set error if not exactly 10 digits
    if (nationalNumber.length !== 10) {
      setErrors(prev => ({
        ...prev,
        phoneNumber: 'Phone number must be exactly 10 digits'
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phoneNumber;
        return newErrors;
      });
    }

    // Update form data
    setFormData(prev => ({
      ...prev,
      phoneNumber: value
    }));
  };



  useEffect(() => {
    // ✅ Get current domain dynamically
    if (typeof window !== "undefined") {
      setDomain(window.location.origin);
    }
  }, []);

  const handleCopy = () => {
    const shareUrl = `${domain}/signup`;

    Swal.fire({
      title: "Copy Link",
      html: `
      <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 15px;">
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" style="background: #f7f7f7; padding: 10px; border-radius: 40px; box-shadow: 2px 3px 4px #ebe1e1;">
          <svg width="24" height="24" fill="#3b5998" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.987h-2.54v-2.892h2.54V9.797c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.772-1.63 1.562v1.875h2.773l-.443 2.892h-2.33V21.88C18.343 21.128 22 16.991 22 12z"/></svg>
        </a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style="background: #f7f7f7; padding: 10px; border-radius: 40px; box-shadow: 2px 3px 4px #ebe1e1;">
          <svg width="24" height="24" fill="#1da1f2" viewBox="0 0 24 24"><path d="M23 2.999a9.001 9.001 0 01-2.608.716A4.522 4.522 0 0022.395.362a9.039 9.039 0 01-2.867 1.097 4.513 4.513 0 00-7.683 4.113 12.798 12.798 0 01-9.293-4.71 4.513 4.513 0 001.397 6.027A4.486 4.486 0 01.893 6.44v.057a4.513 4.513 0 003.622 4.422 4.518 4.518 0 01-2.038.078 4.514 4.514 0 004.213 3.128A9.055 9.055 0 010 19.54 12.781 12.781 0 006.918 21c8.303 0 12.844-6.877 12.844-12.84 0-.196-.004-.392-.013-.586A9.19 9.19 0 0023 2.999z"/></svg>
        </a>
        <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" style="background: #f7f7f7; padding: 10px; border-radius: 40px; box-shadow: 2px 3px 4px #ebe1e1;">
          <svg width="24" height="24" fill="#0077b5" viewBox="0 0 24 24"><path d="M4.98 3.5C3.33 3.5 2 4.82 2 6.48s1.33 2.98 2.98 2.98a2.983 2.983 0 002.98-2.98A2.982 2.982 0 004.98 3.5zM2.4 21.5h5.16v-11H2.4v11zM9.34 10.5h4.93v1.6h.07c.68-1.28 2.35-2.63 4.83-2.63 5.16 0 6.11 3.4 6.11 7.81v4.22h-5.16v-3.74c0-.89-.03-2.04-.77-2.83-.73-.78-1.76-.84-2.49-.84-1.77 0-2.59 1.27-2.59 3.14v4.27h-5.17v-11z"/></svg>
        </a>
        <a href="https://api.whatsapp.com" target="_blank" rel="noopener noreferrer" style="background: #f7f7f7; padding: 10px; border-radius: 40px; box-shadow: 2px 3px 4px #ebe1e1;">
          <svg width="24" height="24" fill="#25d366" viewBox="0 0 24 24"><path d="M20.52 3.48A11.9 11.9 0 0012.01 0C5.37 0 .01 5.36.01 12c0 2.11.55 4.17 1.59 5.97L0 24l6.24-1.63a11.91 11.91 0 005.77 1.47H12c6.63 0 12-5.37 12-12a11.9 11.9 0 00-3.48-8.52zM12 21.75c-1.75 0-3.47-.46-4.97-1.34l-.36-.21-3.69.96.99-3.6-.23-.37A9.72 9.72 0 012.26 12c0-5.37 4.37-9.74 9.75-9.74S21.76 6.63 21.76 12 17.38 21.75 12 21.75zm5.2-7.04c-.28-.14-1.65-.81-1.91-.9-.26-.1-.44-.14-.62.14s-.72.9-.89 1.08-.33.2-.6.07a8.34 8.34 0 01-2.45-1.51 9.24 9.24 0 01-1.71-2.13c-.18-.3 0-.46.13-.6.13-.13.29-.33.44-.49.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.51-.07-.13-.62-1.5-.86-2.06-.23-.56-.46-.48-.62-.49l-.53-.01c-.17 0-.45.06-.69.29a2.86 2.86 0 00-.9 2.12c0 1.24.9 2.44 1.02 2.6.12.17 1.77 2.7 4.3 3.78.6.26 1.06.42 1.42.54.6.19 1.15.16 1.58.1.48-.07 1.65-.68 1.89-1.33.23-.64.23-1.19.16-1.33-.07-.13-.24-.2-.51-.34z"/></svg>
        </a>
        <a href="mailto:?subject=Check this out" style="background: #f7f7f7; padding: 10px; border-radius: 40px; box-shadow: 2px 3px 4px #ebe1e1;">
          <svg width="24" height="24" fill="#555" viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 00-2 2v1.2l10 6.25L22 7.2V6a2 2 0 00-2-2zM2 8.92V18a2 2 0 002 2h16a2 2 0 002-2V8.92l-9.28 5.79a1.2 1.2 0 01-1.44 0L2 8.92z"/></svg>
        </a>
      </div>
      <input type="text" class="p-3 rounded" value="${shareUrl}" id="copyInput" readonly style="margin-top:1rem; width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" />
    `,
      showCancelButton: true,
      confirmButtonColor: "#383d71",
      cancelButtonColor: "#d33",
      confirmButtonText: "Copy Link",
      preConfirm: () => {
        const input = document.getElementById("copyInput") as HTMLInputElement;
        navigator.clipboard.writeText(input.value);
        toast.success('Copied link');
        return false;
      },
    });
  };


  const fetchRoles = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/getRoles`, {
        method: 'GET',
        headers,
      });

      if (response.status === 400) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      if (response.ok) {
        const data = await response.json();

        // Filter out "super admin" from the roles array
        const filteredRoles = (data.roles || []).filter(
          (role: any) => role.name.toLowerCase() !== "super admin"
        );

        setRoles(filteredRoles);

        if (searchParams!.has('singletechnician')) {
          const singleTechnicianRole = filteredRoles.find(
            (role: any) => role.name === 'singletechnician'
          );
          if (singleTechnicianRole) {
            setFormData((prev) => ({
              ...prev,
              role: singleTechnicianRole.name,
              types: singleTechnicianRole.type || '',
            }));
          }
        } else if (searchParams!.has('technician')) {
          const ifstechnician = filteredRoles.find(
            (role: any) => role.name === 'technician'
          );
          if (ifstechnician) {
            setFormData((prev) => ({
              ...prev,
              role: ifstechnician.name,
              types: ifstechnician.type || '',
            }));
          }
        } else if (searchParams!.has('manager')) {  // Added condition for 'manager'
          const managerRole = filteredRoles.find(
            (role: any) => role.name === 'manager'
          );
          if (managerRole) {
            setFormData((prev) => ({
              ...prev,
              role: managerRole.name,
              types: managerRole.type || '',
            }));
          }
        }
      } else {
        console.error('Error fetching roles:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Call the fetchTechnicians function if needed
  useEffect(() => {
    fetchRoles();
  }, []);



  useEffect(() => {
    if (isEdit) {
      setSimpleFlatRateAll(true);
    }
  }, [isEdit]);



  return (
    <div className='w-[60%] m-auto mb-5 m-auto'>
      <Breadcrumb
        items={[
          {
            label: isSingleTechnician ? 'Single Technician' : 'IFS Technicians',
            href: isSingleTechnician ? '/single-technicians/listing' : '/technicians/listing',
          },
          isEdit
            ? { label: isTechnician ? 'Edit Technician' : isManager ? 'Edit Manager' : 'Edit Job' }
            : {
              label: isTechnician ? 'Create Technician' : isManager ? 'Create Manager' : 'Create Single Technician',
              href: '/technicians/create-technician',
            },
        ]}
      />

      <h1 className="text-lg leading-6 font-bold text-gray-900">
        {isEdit
          ? isTechnician
            ? 'Edit Technician'
            : isManager
              ? 'Edit Manager'
              : 'Edit Single Technician'
          : isTechnician
            ? 'Create Technician'
            : isManager
              ? 'Create Manager'
              : 'Create Single Technician'}
      </h1>
      <div className='bg-white p-4 mt-5 '>

        <form onSubmit={handleSubmit}>
          {!isManager && !isSingleTechnician && (
            <div className="flex items-center mb-4 gap-4">
              <div className="inline-flex items-center">
                <label className="flex items-center cursor-pointer relative">
                  <input
                    type="radio"
                    name="techType" // Ensure both radio buttons have the same 'name' to group them
                    checked={formData.techType === "technician"} // This would be the other option
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        techType: e.target.checked ? "technician" : "", // Set or unset the value based on selection
                      }));
                    }}
                    className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded-full shadow bg-white hover:shadow-md border border-slate-300 checked:bg-[#383d71] checked:border-[#383d71]"
                    id="check2" // Ensure unique ID for each input
                  />
                  <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </span>
                </label>
                <label className="cursor-pointer ml-2 text-slate-600 text-sm" htmlFor="check2">
                  Technician
                </label>
              </div>
              <div className="inline-flex items-center">
                <label className="flex items-center cursor-pointer relative">
                  <input
                    type="radio"
                    name="techType" // Ensure both radio buttons have the same 'name' to group them
                    checked={formData.techType === "R/I/R/R"}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        techType: e.target.checked ? "R/I/R/R" : "", // Set or unset the value based on selection
                      }));
                    }}
                    className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded-full shadow bg-white hover:shadow-md border border-slate-300 checked:bg-[#383d71] checked:border-[#383d71]"
                    id="check1" // Ensure unique ID for each input
                  />
                  <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </span>
                </label>
                <label className="cursor-pointer ml-2 text-slate-600 text-sm" htmlFor="check1">
                  R/I/R/R
                </label>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4" style={{ display: 'none' }}>

            <div className='mb-4 relative'>
              <FormControl fullWidth size="small">
                <InputLabel id="role" color="warning">Select role name *</InputLabel>
                <Select
                  labelId="role"
                  id="select-role-name"
                  color="warning"
                  value={formData.role}
                  label="Select role name"
                  name="role"
                  onChange={handleSelectChange}
                  disabled
                >
                  <MenuItem value="" disabled>
                    Select role
                  </MenuItem>
                  {roles
                    .filter((role) => role.name !== "super admin")
                    .map((role, index) => (
                      <MenuItem key={index} value={role.name}>
                        {role.name === "technician"
                          ? "Technician"
                          : role.name === "singletechnician"
                            ? "Single Technician"
                            : role.name === "manager"
                              ? "Manager"
                              : role.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>
          </div>

          <div className={`grid ${isSingleTechnician || selectedRole?.type === 'single-technician' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
            {/* Client Name and Business Name */}
            <div className='mb-4 relative'>

              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon__tech">
                <circle cx="10" cy="6" r="3" stroke="#5B5B99" strokeWidth="1.5" />
                <path d="M5 16C5 13.8 7 12 10 12C13 12 15 13.8 15 16" stroke="#5B5B99" strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              <TextField fullWidth className='form__input' name="firstName" id="outlined-basic" color="warning" label="First name *" size="small" value={formData.firstName} onChange={handleChange} />
              {errors.firstName && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.firstName}
                </div>
              )}
            </div>
            <div className='mb-4 relative'>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon__tech">
                <circle cx="10" cy="6" r="3" stroke="#5B5B99" strokeWidth="1.5" />
                <path d="M5 16C5 13.8 7 12 10 12C13 12 15 13.8 15 16" stroke="#5B5B99" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <TextField fullWidth name="lastName" id="outlined-basic" color="warning" label="Last name *" size="small" value={formData.lastName} onChange={handleChange} />
              {errors.lastName && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.lastName}
                </div>
              )}

            </div>
            {isSingleTechnician && (
              <div className='mb-4 relative'>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon__tech">
                  <circle cx="10" cy="6" r="3" stroke="#5B5B99" strokeWidth="1.5" />
                  <path d="M5 16C5 13.8 7 12 10 12C13 12 15 13.8 15 16" stroke="#5B5B99" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {/* <p className='text-sm mb-2'>Last Name <span className='text-red-500'>*</span></p> */}
                <TextField fullWidth name="businessName" id="outlined-basic" color="warning" label="Business name" size="small" value={formData.businessName} onChange={handleChange} />
              </div>
            )}

          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Client Name and Business Name */}
            <div className='mb-4'>
              <PhoneInput
                international
                defaultCountry="US"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                onKeyDown={(e: any) => {
                  // Prevent typing if already 10 digits in national number
                  const digitsOnly = formData.phoneNumber.replace(/\D/g, '');
                  const nationalNumber = getNationalNumber(digitsOnly, formData.phoneNumber);
                  if (nationalNumber.length >= 10 && e.key !== 'Backspace' && e.key !== 'Delete' && !e.metaKey) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e: any) => {
                  const pasted = e.clipboardData.getData('Text').replace(/\D/g, '');
                  if (pasted.length > 10) e.preventDefault();
                }}
                className={`input text-xs input-bordered w-full p-2 rounded`}
              />
              {errors.phoneNumber && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.phoneNumber}
                </div>
              )}


            </div>
            <div className='mb-4 relative'>
              <svg width="16" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon__tech">
                <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="#5B5B99" strokeWidth="1.2" />
                <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="#5B5B99" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>


              {/* <p className='text-sm mb-2'>Email <span className='text-red-500'>*</span></p> */}
              <TextField fullWidth name="email" id="outlined-basic" color="warning" label="Email *" size="small" value={formData.email} onChange={handleChange} disabled={isEdit} />
              {errors.email && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.email}
                </div>
              )}

            </div>
          </div>



          <div className='mb-4 relative z-10'>
            <GooglePlacesAutocomplete
              apiKey="AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI"
              selectProps={{
                placeholder: 'Search for an address... *',
                value: address,
                onChange: (newValue: SingleValue<GooglePlacesOption>, actionMeta: ActionMeta<GooglePlacesOption>) => {
                  if (newValue) {
                    handleAddressSelect(newValue);
                  } else if (actionMeta.action === 'clear') {
                    // Handle clear action
                    setAddressValue(null); // Make sure you have this state setter
                    setFormData(prev => ({
                      ...prev,
                      address: '',
                    }));
                  }
                },
                isClearable: true,
                styles: {
                  input: (provided) => ({
                    ...provided,
                    borderRadius: '4px',
                    width: '100%'
                  }),
                  control: (provided) => ({
                    ...provided,
                    borderColor: errors.address ? 'red' : '#ccc', // Red border if error exists
                    '&:hover': {
                      borderColor: errors.address ? 'orange' : 'orange',
                    },
                    '&:focus': {
                      borderColor: errors.address ? 'orange' : 'orange',
                    },
                  }),
                }
              }}
              autocompletionRequest={{
                componentRestrictions: {
                  country: 'us' // Restrict to US addresses only
                }
              }}
            />
            {errors.address && (
              <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                {errors.address}
              </div>
            )}
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className='mb-4 relative'>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="icon__tech" xmlns="http://www.w3.org/2000/svg">
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

              <TextField fullWidth type='number' name="secondaryContactName" id="outlined-basic" color="warning" label="Secondary phone number" size="small" value={formData.secondaryContactName} onChange={handleChange} inputProps={{
                maxLength: 10,
              }} />


            </div>
            <div className='mb-4 relative'>
              <svg width="16" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon__tech">
                <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="#5B5B99" strokeWidth="1.2" />
                <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="#5B5B99" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <TextField fullWidth name="secondaryEmail" id="outlined-basic" color="warning" label="Secondary email address" size="small" value={formData.secondaryEmail} onChange={handleChange}
              />
              {errors.emailError && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.emailError}
                </div>
              )}

            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">

            <div className='mb-4 relative'>

              <TextField fullWidth type={showPassword ? "text" : "password"} name="password" id="outlined-basic" color="warning" label="Password" size="small" value={formData.password} onChange={handleChange} />
              <button
                type="button"
                style={{ position: 'absolute', right: '10px', top: '10px' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Image src={Eye} width='16' height='16' alt="eye" /> : <Image src={EyeOff} width='16' height='16' alt="eye" />
                }
              </button>
              {errors.password && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.password}
                </div>
              )}
            </div>
            <div className='mb-4 relative'>

              <TextField
                fullWidth

                type={showConformPassword ? "text" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                color="warning"
                label="Confirm password"
                size="small"
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}

              />
              <button
                type="button"
                style={{ position: 'absolute', right: '10px', top: '10px' }}
                onClick={() => setShowConformPassword(!showConformPassword)}
              >
                {showConformPassword ? <Image src={Eye} width='16' height='16' alt="eye" /> : <Image src={EyeOff} width='16' height='16' alt="eye" />
                }
              </button>
              {errors.confirmPassword && (
                <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                  {errors.confirmPassword}
                </div>
              )}
            </div>
          </div>



          <div className="grid grid-cols-3 gap-4 mt-4">

            <div className='mb-2'>

              <div className="form-control w-full p-3 mt-1 rounded relative" style={{ border: '2px dashed #ccc' }}>
                <label className="label text-center">
                  <svg className='m-auto' width="34" height="34" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.953 15.7599C22.3011 15.7599 22.5895 15.8644 22.9124 16.1544L29.2453 22.2609C29.5218 22.5367 29.6876 22.8314 29.6876 23.2368C29.6876 23.9911 29.1353 24.5254 28.3621 24.5254C27.9928 24.5254 27.607 24.3784 27.3485 24.0838L24.5506 21.1201L23.2982 19.8127L23.427 22.5564V36.7479C23.427 37.5219 22.7458 38.1662 21.9538 38.1662C21.1626 38.1662 20.4995 37.5219 20.4995 36.7479V22.5556L20.6095 19.8119L19.3578 21.1193L16.5764 24.0838C16.4507 24.2228 16.2974 24.3339 16.1262 24.4101C15.955 24.4863 15.7698 24.5258 15.5825 24.5262C14.8093 24.5262 14.2389 23.9919 14.2389 23.2368C14.2389 22.8314 14.3858 22.5375 14.6616 22.2609L20.886 16.2581C21.2545 15.8888 21.5853 15.7599 21.9546 15.7599M25.6765 2.96301C32.3606 2.96301 37.7789 8.3813 37.7789 15.0646C37.7789 15.4449 37.7608 15.8212 37.727 16.1921C41.108 16.9888 43.6246 20.0264 43.6246 23.6501C43.6246 27.8819 40.1942 31.3124 35.9623 31.3124H27.123V28.3659H35.9608C36.58 28.3659 37.1933 28.244 37.7654 28.007C38.3376 27.77 38.8575 27.4226 39.2954 26.9847C39.7333 26.5468 40.0806 26.0269 40.3176 25.4548C40.5546 24.8826 40.6766 24.2694 40.6766 23.6501C40.6764 22.5885 40.3182 21.5579 39.66 20.725C39.0017 19.8921 38.0818 19.3055 37.049 19.0599L34.5551 18.4722L34.7908 15.921C34.8175 15.6382 34.8301 15.3522 34.8301 15.0646C34.8301 10.0085 30.7318 5.90944 25.675 5.90944C24.148 5.90809 22.645 6.2892 21.3031 7.01798C19.9612 7.74676 18.8233 8.8 17.993 10.0816L16.7948 11.9233L14.6883 11.301C14.1166 11.1316 13.5137 11.0948 12.9255 11.1933C12.3374 11.2918 11.7794 11.5231 11.2941 11.8695C10.8087 12.216 10.4087 12.6685 10.1244 13.1927C9.84011 13.717 9.67906 14.2991 9.65347 14.8949L9.65033 15.1251L9.7234 17.6001L7.36861 18.143C6.22908 18.4081 5.21281 19.051 4.48522 19.9672C3.75763 20.8834 3.36156 22.0189 3.36147 23.1889C3.36147 24.5621 3.90699 25.8791 4.87803 26.8502C5.84906 27.8212 7.16607 28.3667 8.53933 28.3667H16.9088V31.3132H8.53933C4.0529 31.3132 0.415039 27.6753 0.415039 23.1889C0.415039 19.3326 3.10218 16.1033 6.70625 15.272L6.70311 15.0646C6.70282 13.9956 6.95199 12.9413 7.4308 11.9855C7.90961 11.0297 8.60484 10.1989 9.46119 9.55904C10.3176 8.91919 11.3114 8.48801 12.3637 8.29978C13.416 8.11156 14.4977 8.17148 15.5228 8.4748C17.6811 5.15673 21.4219 2.96301 25.675 2.96301" fill="#383d71" />
                  </svg>
                  <p className='text-sm mb-1 mt-1 laptop__font'>Upload Tax Form</p>
                  <span className="text-center m-auto text-xs block laptop__size"> (Only JPEG, Webp, PNG, GIF & PDF files are accepted.)</span>
                </label>
                <input type="file" multiple accept=".jpeg,.jpg,.png,.webp,.pdf" className="input input-bordered w-full opacity-0 absolute inset-0" onChange={handleFileChange} />

              </div>
              <div className="flex flex-wrap gap-5 items-center relative mt-5">
                {formData.taxForms?.map((file: string | File, index: number) => {
                  let fileSrc = "";
                  let fileType = "";

                  if (typeof file === "string") {
                    fileSrc = file;
                    fileType = /\.(png|jpe?g|webp)$/i.test(file) ? "image" : file.toLowerCase().endsWith(".pdf") ? "application/pdf" : "";
                  } else if (file instanceof File) {
                    fileSrc = URL.createObjectURL(file);
                    fileType = file.type;
                  }

                  return (
                    <div key={index} className="shadow rounded p-2 relative flex items-center gap-2">
                      {fileType === "image" || fileType.startsWith("image/") ? (
                        <img src={fileSrc} alt="Uploaded file" className="w-12 h-12 object-cover" />
                      ) : fileType === "application/pdf" ? (
                        <a href={fileSrc} target="_blank" className="text-sm text-black-600 flex gap-1">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="orange" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 2H14L20 8V22H6V2Z" stroke="orange" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 2V8H20" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg> View PDF
                        </a>
                      ) : null}

                      <button type='button' onClick={() => handleRemoveFile(index, 'taxForm')} className="absolute right-[-10px] top-[-5px]">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M18 6L6 18M6 6L18 18" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
            <div className='mb-0'>
              <div className="form-control w-full p-3 mt-1 rounded relative" style={{ border: '2px dashed #ccc' }}>
                <label className="label text-center">
                  <svg className='m-auto' width="34" height="34" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.953 15.7599C22.3011 15.7599 22.5895 15.8644 22.9124 16.1544L29.2453 22.2609C29.5218 22.5367 29.6876 22.8314 29.6876 23.2368C29.6876 23.9911 29.1353 24.5254 28.3621 24.5254C27.9928 24.5254 27.607 24.3784 27.3485 24.0838L24.5506 21.1201L23.2982 19.8127L23.427 22.5564V36.7479C23.427 37.5219 22.7458 38.1662 21.9538 38.1662C21.1626 38.1662 20.4995 37.5219 20.4995 36.7479V22.5556L20.6095 19.8119L19.3578 21.1193L16.5764 24.0838C16.4507 24.2228 16.2974 24.3339 16.1262 24.4101C15.955 24.4863 15.7698 24.5258 15.5825 24.5262C14.8093 24.5262 14.2389 23.9919 14.2389 23.2368C14.2389 22.8314 14.3858 22.5375 14.6616 22.2609L20.886 16.2581C21.2545 15.8888 21.5853 15.7599 21.9546 15.7599M25.6765 2.96301C32.3606 2.96301 37.7789 8.3813 37.7789 15.0646C37.7789 15.4449 37.7608 15.8212 37.727 16.1921C41.108 16.9888 43.6246 20.0264 43.6246 23.6501C43.6246 27.8819 40.1942 31.3124 35.9623 31.3124H27.123V28.3659H35.9608C36.58 28.3659 37.1933 28.244 37.7654 28.007C38.3376 27.77 38.8575 27.4226 39.2954 26.9847C39.7333 26.5468 40.0806 26.0269 40.3176 25.4548C40.5546 24.8826 40.6766 24.2694 40.6766 23.6501C40.6764 22.5885 40.3182 21.5579 39.66 20.725C39.0017 19.8921 38.0818 19.3055 37.049 19.0599L34.5551 18.4722L34.7908 15.921C34.8175 15.6382 34.8301 15.3522 34.8301 15.0646C34.8301 10.0085 30.7318 5.90944 25.675 5.90944C24.148 5.90809 22.645 6.2892 21.3031 7.01798C19.9612 7.74676 18.8233 8.8 17.993 10.0816L16.7948 11.9233L14.6883 11.301C14.1166 11.1316 13.5137 11.0948 12.9255 11.1933C12.3374 11.2918 11.7794 11.5231 11.2941 11.8695C10.8087 12.216 10.4087 12.6685 10.1244 13.1927C9.84011 13.717 9.67906 14.2991 9.65347 14.8949L9.65033 15.1251L9.7234 17.6001L7.36861 18.143C6.22908 18.4081 5.21281 19.051 4.48522 19.9672C3.75763 20.8834 3.36156 22.0189 3.36147 23.1889C3.36147 24.5621 3.90699 25.8791 4.87803 26.8502C5.84906 27.8212 7.16607 28.3667 8.53933 28.3667H16.9088V31.3132H8.53933C4.0529 31.3132 0.415039 27.6753 0.415039 23.1889C0.415039 19.3326 3.10218 16.1033 6.70625 15.272L6.70311 15.0646C6.70282 13.9956 6.95199 12.9413 7.4308 11.9855C7.90961 11.0297 8.60484 10.1989 9.46119 9.55904C10.3176 8.91919 11.3114 8.48801 12.3637 8.29978C13.416 8.11156 14.4977 8.17148 15.5228 8.4748C17.6811 5.15673 21.4219 2.96301 25.675 2.96301" fill="#383d71" />
                  </svg>
                  <p className='text-sm mb-1 mt-1 laptop__font'>Upload Profile Image</p>
                  <span className="text-center m-auto text-xs block laptop__size"> (Only 'JPEG, WEBP, GIF and PNG' images will be accepted)</span>
                </label>
                <input type="file" accept="image/jpeg, image/png, image/webp" className="input input-bordered w-full opacity-0 absolute inset-0" onChange={handleImageChange} />
              </div>

              {formData.image && (
                <div className='flex items-center mt-5 shadow w-[fit-content] rounded p-2 relative'>
                  {formData.image instanceof File ? (
                    <img src={URL.createObjectURL(formData.image)} alt="Uploaded file" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                  ) : (
                    <img src={formData.image} alt="Uploaded image" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                  )}
                  <button type='button' onClick={() => handleRemoveFile(0, 'profileImage')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', position: 'absolute', right: '-10px', top: '0' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M18 6L6 18M6 6L18 18" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {isSingleTechnician && (
              <div className='mb-0'>
                <div className="form-control w-full p-3 mt-1 rounded relative" style={{ border: '2px dashed #ccc' }}>
                  <label className="label text-center">
                    <svg className='m-auto' width="34" height="34" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.953 15.7599C22.3011 15.7599 22.5895 15.8644 22.9124 16.1544L29.2453 22.2609C29.5218 22.5367 29.6876 22.8314 29.6876 23.2368C29.6876 23.9911 29.1353 24.5254 28.3621 24.5254C27.9928 24.5254 27.607 24.3784 27.3485 24.0838L24.5506 21.1201L23.2982 19.8127L23.427 22.5564V36.7479C23.427 37.5219 22.7458 38.1662 21.9538 38.1662C21.1626 38.1662 20.4995 37.5219 20.4995 36.7479V22.5556L20.6095 19.8119L19.3578 21.1193L16.5764 24.0838C16.4507 24.2228 16.2974 24.3339 16.1262 24.4101C15.955 24.4863 15.7698 24.5258 15.5825 24.5262C14.8093 24.5262 14.2389 23.9919 14.2389 23.2368C14.2389 22.8314 14.3858 22.5375 14.6616 22.2609L20.886 16.2581C21.2545 15.8888 21.5853 15.7599 21.9546 15.7599M25.6765 2.96301C32.3606 2.96301 37.7789 8.3813 37.7789 15.0646C37.7789 15.4449 37.7608 15.8212 37.727 16.1921C41.108 16.9888 43.6246 20.0264 43.6246 23.6501C43.6246 27.8819 40.1942 31.3124 35.9623 31.3124H27.123V28.3659H35.9608C36.58 28.3659 37.1933 28.244 37.7654 28.007C38.3376 27.77 38.8575 27.4226 39.2954 26.9847C39.7333 26.5468 40.0806 26.0269 40.3176 25.4548C40.5546 24.8826 40.6766 24.2694 40.6766 23.6501C40.6764 22.5885 40.3182 21.5579 39.66 20.725C39.0017 19.8921 38.0818 19.3055 37.049 19.0599L34.5551 18.4722L34.7908 15.921C34.8175 15.6382 34.8301 15.3522 34.8301 15.0646C34.8301 10.0085 30.7318 5.90944 25.675 5.90944C24.148 5.90809 22.645 6.2892 21.3031 7.01798C19.9612 7.74676 18.8233 8.8 17.993 10.0816L16.7948 11.9233L14.6883 11.301C14.1166 11.1316 13.5137 11.0948 12.9255 11.1933C12.3374 11.2918 11.7794 11.5231 11.2941 11.8695C10.8087 12.216 10.4087 12.6685 10.1244 13.1927C9.84011 13.717 9.67906 14.2991 9.65347 14.8949L9.65033 15.1251L9.7234 17.6001L7.36861 18.143C6.22908 18.4081 5.21281 19.051 4.48522 19.9672C3.75763 20.8834 3.36156 22.0189 3.36147 23.1889C3.36147 24.5621 3.90699 25.8791 4.87803 26.8502C5.84906 27.8212 7.16607 28.3667 8.53933 28.3667H16.9088V31.3132H8.53933C4.0529 31.3132 0.415039 27.6753 0.415039 23.1889C0.415039 19.3326 3.10218 16.1033 6.70625 15.272L6.70311 15.0646C6.70282 13.9956 6.95199 12.9413 7.4308 11.9855C7.90961 11.0297 8.60484 10.1989 9.46119 9.55904C10.3176 8.91919 11.3114 8.48801 12.3637 8.29978C13.416 8.11156 14.4977 8.17148 15.5228 8.4748C17.6811 5.15673 21.4219 2.96301 25.675 2.96301" fill="#383d71" />
                    </svg>
                    <p className='text-sm mb-1 mt-1 laptop__font'>Upload Business Logo</p>
                    <span className="text-center m-auto text-xs block laptop__size"> (Only 'jpeg, webp, and png' images will be accepted)</span>
                  </label>
                  <input type="file" accept="image/jpeg, image/png, image/webp" className="input input-bordered w-full opacity-0 absolute inset-0" onChange={handleLogoChange} />
                </div>

                {formData.businessLogo && (
                  <div className='flex items-center mt-5 shadow rounded p-2 relative w-[fit-content]'>
                    {formData.businessLogo instanceof File ? (
                      <img src={URL.createObjectURL(formData.businessLogo)} alt="Uploaded file" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                    ) : (
                      <img src={formData.businessLogo} alt="Uploaded image" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                    )}
                    <button type='button' onClick={() => handleRemoveFile(0, 'businessLogo')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', position: 'absolute', right: '0', top: '0' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M18 6L6 18M6 6L18 18" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-left">
            <button
              type="submit"
              className="primary-bg pl-5 pr-5 p-2 rounded flex items-center justify-center gap-2 min-w-[100px]"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
