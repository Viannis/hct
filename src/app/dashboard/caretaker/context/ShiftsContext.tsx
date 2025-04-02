import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useQuery, useMutation } from "@apollo/client";
import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Shift } from "@prisma/client";
import {
  GET_HOURS_LAST_7_DAYS,
  GET_LOCATION,
  GET_SHIFTS,
} from "@utils/queries";
import { CLOCK_IN, CLOCK_OUT } from "@utils/mutations";

if (process.env.NODE_ENV !== "production") {
  loadDevMessages();
  loadErrorMessages();
}

type HoursPerDay = {
  date: string;
  hours: number;
};

type Location = {
  latitude: number;
  longitude: number;
  radius: number;
};

type Loading = {
  shifts: boolean;
  shiftsRefetching: boolean;
  clockInOut: boolean;
  hoursLast7Days: boolean;
  location: boolean;
  user: boolean;
};

type Error = {
  user: boolean;
  shifts: boolean;
  shiftsRefetching: boolean;
  clockInOut: boolean;
  hoursLast7Days: boolean;
  location: boolean;
};

interface ShiftsContextType {
  shifts: Shift[];
  hoursLast7Days: HoursPerDay[];
  location: Location | null;
  loading: Loading;
  setLoading: React.Dispatch<React.SetStateAction<Loading>>;
  handleClockIn: (note: string, locationName: string) => Promise<void>;
  handleClockOut: (id: string, note: string) => Promise<void>;
  handleDateRangeChange: (startDate: Date, endDate: Date) => Promise<void>;
  error: Error;
}

const ShiftsContext = createContext<ShiftsContextType | undefined>(undefined);

export const ShiftsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, error: userError, isLoading: userLoading } = useUser();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [hoursLast7Days, setHoursLast7Days] = useState<HoursPerDay[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState<Loading>({
    user: true,
    shifts: true,
    clockInOut: false,
    shiftsRefetching: false,
    hoursLast7Days: true,
    location: true,
  });
  const [error, setError] = useState<Error>({
    user: false,
    shifts: false,
    shiftsRefetching: false,
    clockInOut: false,
    hoursLast7Days: false,
    location: false,
  });

  const {
    // Get the shifts data from the database
    data: shiftsData,
    error: shiftsError,
    refetch: refetchShifts,
  } = useQuery(GET_SHIFTS, {
    variables: {
      userId: user?.sub,
    },
    skip: !user,
    onCompleted: () => setLoading((prev) => ({ ...prev, shifts: false })),
    onError: (error) => {
      console.log("Error fetching shifts", error);
      setError((prev) => ({ ...prev, shifts: true }));
    },
  });

  const { data: hoursData, refetch: refetchHours } = useQuery(
    // Get total hours worked across all the shifts for each day
    GET_HOURS_LAST_7_DAYS,
    {
      onCompleted: () => setLoading((prev) => ({ ...prev, hours: false })),
      onError: (error) => {
        console.log("Error fetching hours", error);
        setError((prev) => ({ ...prev, hoursLast7Days: true }));
      },
    }
  );

  const { data: locationData, loading: locationLoading } = useQuery(
    GET_LOCATION,
    {
      // Get the location data from the database
      onCompleted: () => {
        console.log("Location fetched");
      },
      onError: (error) => {
        console.log("Error fetching location", error);
        setError((prev) => ({ ...prev, location: true }));
      },
    }
  );

  const [clockInMutation] = useMutation(CLOCK_IN, {
    // Clock in a shift (graphQL Mutation)
    update(cache, { data: { clockIn } }) {
      // Update the cache for faster rendering compared to refetching the data from the database
      console.log("Clocked in mutation update cache triggered");
      console.log("ClockIn data:", clockIn);

      const { shifts } = cache.readQuery({
        query: GET_SHIFTS,
        variables: {
          userId: user?.sub,
          dateRange: undefined,
        },
      }) as { shifts: Shift[] };

      console.log("Shifts from cache before update:", shifts);

      if (clockIn) {
        cache.writeQuery({
          query: GET_SHIFTS,
          variables: {
            userId: user?.sub,
            dateRange: undefined,
          },
          data: {
            shifts: [clockIn, ...shifts], // Update the cache with the new shift (clockIn)
          },
        });
      }

      const { shifts: updatedShifts } = cache.readQuery({
        query: GET_SHIFTS,
        variables: {
          userId: user?.sub,
          dateRange: undefined,
        },
      }) as { shifts: Shift[] };

      console.log("Shifts from cache after update:", updatedShifts);
    },
    onCompleted: () => {
      console.log("Clocked in");
    },
    onError: (error) => {
      console.log("Error clocking in", error);
      throw error;
    },
  });

  const [clockOutMutation] = useMutation(CLOCK_OUT, {
    // Clock out a shift (graphQL Mutation)
    onCompleted: () => {
      refetchShifts(); // Refetch the shifts data from the database
      refetchHours(); // Refetch the hours data from the database
    },
    onError: (error) => {
      console.log("Error clocking out", error);
      throw error;
    },
  });

  useEffect(() => {
    if (!userLoading && user) {
      setLoading((prev) => ({ ...prev, user: false }));
    }
    if (shiftsData) {
      console.log("Shifts data:", shiftsData);
      setShifts(shiftsData.shifts);
      setLoading((prev) => ({ ...prev, shifts: false }));
    }
    if (shiftsError) {
      setError((prev) => ({ ...prev, shifts: true }));
    }
    if (hoursData) {
      setHoursLast7Days(hoursData.hoursLast7Days);
      setLoading((prev) => ({ ...prev, hoursLast7Days: false }));
    }
    if (!locationLoading && locationData) {
      setLocation(locationData.location);
      setLoading((prev) => ({ ...prev, location: false }));
    }
    if (userError) {
      setError((prev) => ({ ...prev, user: true }));
    }
    if (userLoading) {
      setLoading((prev) => ({ ...prev, user: true }));
    }
  }, [
    userLoading,
    shiftsData,
    hoursData,
    locationData,
    userError,
    locationLoading,
    shiftsError,
    user,
  ]); // Set the shifts, hours, location, user, and loading states

  const clockIn = useCallback(
    (note: string, locationName: string) => {
      return clockInMutation({ variables: { input: { note, locationName } } })
        .then(() => {
          console.log("Clocked in");
        })
        .catch((error) => {
          console.log("Error clocking in", error);
          throw error;
        });
    },
    [clockInMutation]
  ); // Clock in a shift

  const clockOut = useCallback(
    (id: string, note: string) => {
      return clockOutMutation({ variables: { input: { id, note } } })
        .then(() => {
          console.log("Clocked out");
        })
        .catch((error) => {
          console.log("Error clocking out", error);
          throw error;
        });
    },
    [clockOutMutation]
  ); // Clock out a shift

  const handleDateRangeChange = useCallback(
    (startDate: Date, endDate: Date) => {
      return refetchShifts({
        userId: user?.sub,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      })
        .then(() => {
          console.log("Shifts refetched");
        })
        .catch((error) => {
          console.log("Error fetching shifts", error);
          throw error;
        });
    },
    [refetchShifts, user?.sub]
  ); // Handle the date range change where Shifts of the caretaker will be fetched based on the date range

  const value = useMemo(
    // Provide the context value to the children
    () => ({
      shifts,
      hoursLast7Days,
      loading,
      location,
      error,
      handleClockIn: clockIn,
      handleClockOut: clockOut,
      handleDateRangeChange,
      setLoading,
    }),
    [
      shifts,
      hoursLast7Days,
      loading,
      location,
      clockIn,
      clockOut,
      error,
      handleDateRangeChange,
      setLoading,
    ]
  ); // Provide the context value to the children

  return (
    <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>
  ); // Return the ShiftsContext.Provider with the value
};

export const useShifts = () => {
  const context = useContext(ShiftsContext);
  if (!context) {
    // If the context is not found, throw an error
    throw new Error("useShifts must be used within a ShiftsProvider");
  }
  return context; // Return the context
};
