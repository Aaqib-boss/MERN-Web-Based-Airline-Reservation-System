import React, { createContext, useState, useContext } from 'react';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [step, setStep] = useState('search'); // 'search', 'results', 'seats', 'passengers', 'payment', 'confirmation'
  const [searchParams, setSearchParams] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [cabinClass, setCabinClass] = useState('Economy');
  const [bookingConfirmation, setBookingConfirmation] = useState(null);

  const startNewSearch = (params) => {
    setSearchParams(params);
    setCabinClass(params.cabinClass || 'Economy');
    setStep('results');
  };

  const selectFlight = (flight) => {
    setSelectedFlight(flight);
    setSelectedSeats([]);
    setStep('seats');
  };

  const selectSeats = (seats) => {
    setSelectedSeats(seats);
    setStep('passengers');
  };

  const submitPassengers = (passData) => {
    setPassengers(passData);
    setStep('payment');
  };

  const resetBooking = () => {
    setSearchParams(null);
    setSearchResults([]);
    setSelectedFlight(null);
    setSelectedSeats([]);
    setPassengers([]);
    setBookingConfirmation(null);
    setStep('search');
  };

  return (
    <BookingContext.Provider value={{
      step,
      setStep,
      searchParams,
      setSearchParams,
      searchResults,
      setSearchResults,
      selectedFlight,
      setSelectedFlight,
      selectedSeats,
      setSelectedSeats,
      passengers,
      setPassengers,
      cabinClass,
      setCabinClass,
      bookingConfirmation,
      setBookingConfirmation,
      startNewSearch,
      selectFlight,
      selectSeats,
      submitPassengers,
      resetBooking
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
export { BookingContext };
