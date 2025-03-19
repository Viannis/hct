import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useUser, UserProfile } from "@auth0/nextjs-auth0/client";
import { Location } from "@prisma/client";
import { GET_LOCATION, GET_ALL_SHIFTS } from "@utils/queries";
import { CREATE_LOCATION, UPDATE_LOCATION } from "@utils/mutations";

type Error = {
  location: string;
  user: string;
  shifts: string;
};

type Loading = {
  location: boolean;
  user: boolean;
  shifts: boolean;
};

interface UserLocationContextType {
  location: Location | null;
  user: UserProfile | null;
  loading: Loading;
  error: Error;
  createLocation: (location: Location) => void;
  updateLocation: (location: Location) => void;
  handleDateRangeChange: (startDate: Date, endDate: Date) => Promise<void>;
  shiftsData:
    | {
        allShifts: Array<{
          id: string;
          clockIn: Date;
          clockOut: Date | null;
          clockInNote: string;
          clockOutNote: string;
          user: { id: string; name: string };
        }>;
      }
    | undefined;
}

const UserLocationContext = createContext<UserLocationContextType | null>(null);

export const UserLocationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState<Loading>({
    location: true,
    user: true,
    shifts: true,
  });
  const [error, setError] = useState<Error>({
    location: "",
    user: "",
    shifts: "",
  });
  const [location, setLocation] = useState<Location | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const {
    user: sessionUser,
    error: userError,
    isLoading: userLoading,
  } = useUser();
  const {
    data,
    loading: locationLoading,
    error: locationError,
  } = useQuery(GET_LOCATION, {
    skip: !sessionUser,
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error fetching location", error);
      setError((prev) => ({ ...prev, location: "Error fetching location" }));
    },
  }); // Fetch the location from the database

  const [createLocationMutation] = useMutation(CREATE_LOCATION, {
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error creating location", error);
      setError((prev) => ({ ...prev, location: "Error creating location" }));
    },
  }); // Create the location in the database

  const [updateLocationMutation] = useMutation(UPDATE_LOCATION, {
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error updating location", error);
      setError((prev) => ({ ...prev, location: "Error updating location" }));
    },
  }); // Update the location in the database

  const {
    data: shiftsData,
    error: shiftsError,
    loading: shiftsLoading,
    refetch: refetchAllShifts,
  } = useQuery(GET_ALL_SHIFTS, {
    skip: !sessionUser,
  });

  useEffect(() => {
    if (sessionUser && !userLoading) {
      console.log("session User", sessionUser);
      setUser(sessionUser);
      setLoading((prev) => ({ ...prev, user: false }));
    }
    if (userError) {
      setError((prev) => ({ ...prev, user: userError.message }));
    }
    if (data && !locationLoading) {
      console.log("data", data);
      setLocation(data.location);
      setLoading((prev) => ({ ...prev, location: false }));
    }
    if (locationError) {
      console.error("Error fetching location:", locationError);
      setError((prev) => ({ ...prev, location: locationError.message }));
    }
    if (shiftsData && !shiftsLoading) {
      console.log("shiftsData", shiftsData);
      setLoading((prev) => ({ ...prev, shifts: false }));
    }
    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
      setError((prev) => ({ ...prev, shifts: shiftsError.message }));
    }
  }, [
    data,
    userError,
    userLoading,
    sessionUser,
    shiftsError,
    shiftsData,
    shiftsLoading,
    locationLoading,
    locationError,
  ]); // Set the location and user in the state

  const createLocation = useCallback(
    (location: Location) =>
      createLocationMutation({ variables: { input: location } }),
    [createLocationMutation]
  ); // Create the location in the database

  const updateLocation = useCallback(
    (location: Location) =>
      updateLocationMutation({ variables: { input: location } }),
    [updateLocationMutation]
  ); // Update the location in the database

  const handleDateRangeChange = useCallback(
    (startDate: Date, endDate: Date) => {
      return refetchAllShifts({
        variables: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      })
        .then(() => {
          console.log("Shifts refetched");
        })
        .catch((error) => {
          console.error("Error fetching shifts:", error);
          throw error;
        });
    },
    [refetchAllShifts]
  );

  const value = useMemo(
    () => ({
      location,
      loading,
      error,
      createLocation,
      updateLocation,
      user,
      handleDateRangeChange,
      shiftsData,
    }),
    [
      location,
      loading,
      error,
      createLocation,
      updateLocation,
      user,
      shiftsData,
      handleDateRangeChange,
    ]
  ); // Create the value for the context

  return (
    <UserLocationContext.Provider value={value}>
      {children}
    </UserLocationContext.Provider>
  ); // Return the context provider
};

export const useUserLocation = () => {
  const context = useContext(UserLocationContext);
  if (!context)
    throw new Error(
      "useUserLocation must be used within a UserLocationProvider"
    ); // Throw an error if the context is not found
  return context;
};
