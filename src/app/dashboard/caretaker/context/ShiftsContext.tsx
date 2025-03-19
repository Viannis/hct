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
  handleClockIn: (note: string) => Promise<void>;
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
    user: userLoading,
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
    GET_HOURS_LAST_7_DAYS,
    {
      onCompleted: () => setLoading((prev) => ({ ...prev, hours: false })),
      onError: (error) => {
        console.log("Error fetching hours", error);
        setError((prev) => ({ ...prev, hoursLast7Days: true }));
      },
    }
  );

  const { data: locationData } = useQuery(GET_LOCATION, {
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error fetching location", error);
      setError((prev) => ({ ...prev, location: true }));
    },
  });

  const [clockInMutation] = useMutation(CLOCK_IN, {
    update(cache, { data: { clockIn } }) {
      console.log("Clocked in mutation update cache triggered");
      console.log("ClockIn data:", clockIn);

      const { shifts } = cache.readQuery({
        query: GET_SHIFTS,
        variables: {
          userId: user?.sub,
          dateRange: undefined, // Ensure this matches your query usage
        },
      }) as { shifts: Shift[] };

      console.log("Shifts from cache before update:", shifts);

      if (clockIn) {
        cache.writeQuery({
          query: GET_SHIFTS,
          variables: {
            userId: user?.sub,
            dateRange: undefined, // Ensure this matches your query usage
          },
          data: {
            shifts: [clockIn, ...shifts],
          },
        });
      }

      const { shifts: updatedShifts } = cache.readQuery({
        query: GET_SHIFTS,
        variables: {
          userId: user?.sub,
          dateRange: undefined, // Ensure this matches your query usage
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
    onCompleted: () => {
      refetchShifts();
      refetchHours();
    },
    onError: (error) => {
      console.log("Error clocking out", error);
      throw error;
    },
  });

  useEffect(() => {
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
    if (locationData) {
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
    shiftsData,
    hoursData,
    locationData,
    userError,
    userLoading,
    shiftsError,
  ]);

  const clockIn = useCallback(
    (note: string) => {
      return clockInMutation({ variables: { input: { note } } })
        .then(() => {
          console.log("Clocked in");
        })
        .catch((error) => {
          console.log("Error clocking in", error);
          throw error;
        });
    },
    [clockInMutation]
  );

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
  );

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
  );

  const value = useMemo(
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
  );

  return (
    <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>
  );
};

export const useShifts = () => {
  const context = useContext(ShiftsContext);
  if (!context) {
    throw new Error("useShifts must be used within a ShiftsProvider");
  }
  return context;
};
