import { useContext } from 'react';
import { BookingContext } from '../context/BookingContext';

export const useBooking = () => {
  return useContext(BookingContext);
};
