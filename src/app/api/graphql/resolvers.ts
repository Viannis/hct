import { Claims } from "@auth0/nextjs-auth0";
import { PrismaClient, UserRole } from "@prisma/client";
import { GraphQLError } from "graphql";

const prisma = new PrismaClient();

console.log("Resolvers called");

type Context = {
  user: Claims;
};

type ErrorResponse = {
  message: string;
  extensions: {
    code: string;
    status: number;
  };
};

type DailyTotal = {
  date: string;
  hours: number;
};

type UserDailyHours = {
  userId: string;
  userName: string;
  dailyTotals: DailyTotal[];
};

const errorResponse = (status: number): ErrorResponse => {
  // Common error response for all queries and mutations
  switch (status) {
    case 401:
      return {
        message: "Not authenticated",
        extensions: { code: "UNAUTHENTICATED", status: 401 },
      };
    case 404:
      return {
        message: "User not found",
        extensions: { code: "NOT_FOUND", status: 404 },
      };
    case 403:
      return {
        message: "Not authorized",
        extensions: { code: "FORBIDDEN", status: 403 },
      };
    case 409:
      return {
        message: "Record already exists",
        extensions: { code: "CONFLICT", status: 409 },
      };
    default:
      return {
        message: "An error occurred",
        extensions: { code: "INTERNAL_SERVER_ERROR", status: 500 },
      };
  }
};

export const resolvers = {
  Query: {
    user: async (
      // Get the user by ID
      _: unknown,
      { userId }: { userId: string },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: user.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (currentUser.role !== "MANAGER") {
        // Check if the user is a manager
        if (userId !== user.sub) {
          // Check if the user is the same as the one fetching the user
          const error = errorResponse(403); // Return the error response
          throw new GraphQLError(error.message, {
            extensions: error.extensions,
          });
        }
      }

      const userRecord = await prisma.user.findUnique({
        // Get the user by ID
        where: {
          auth0Id: user.sub,
        },
      });

      return userRecord;
    },

    location: async (_: unknown, __: unknown, context: Context) => {
      // Get the location
      const { user } = context;

      if (!user?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const location = await prisma.location.findFirst(); // Get the location

      return location;
    },

    caretakers: async (_: unknown, __: unknown, context: Context) => {
      // Get the caretakers
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (currentUser.role !== "MANAGER") {
        // Check if the user is a manager
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const caretakers = await prisma.user.findMany({
        // Get the caretakers
        where: { role: "CARETAKER" },
        include: {
          shifts: {
            orderBy: { clockIn: "desc" },
            take: 1,
          },
        },
      });

      return caretakers.map((caretaker) => ({
        // Map the caretakers
        id: caretaker.id,
        name: caretaker.name,
        email: caretaker.email,
        lastClockedIn: caretaker.shifts[0]?.clockIn || null,
        lastClockedOut: caretaker.shifts[0]?.clockOut || null,
      }));
    },

    caretakerShifts: async (
      // Get the caretaker shifts
      _: unknown,
      { userId }: { userId: string },
      context: Context
    ) => {
      console.log("Caretaker shifts query called");
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (currentUser.role !== "MANAGER") {
        // Check if the user is a manager
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const caretakerShifts = await prisma.user.findUnique({
        // Get the caretaker shifts
        where: { id: userId },
        include: {
          shifts: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!caretakerShifts) {
        // Check if the caretaker shifts are found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      console.log("Caretaker shifts:", caretakerShifts); // Log the caretaker shifts

      return {
        id: caretakerShifts.id,
        name: caretakerShifts.name,
        email: caretakerShifts.email,
        shifts: caretakerShifts.shifts || [],
      };
    },

    shifts: async (
      // Get the shifts by user ID and date range
      _: unknown,
      {
        userId,
        dateRange,
      }: {
        userId: string;
        dateRange?: { startDate: Date; endDate: Date };
      },
      context: Context
    ) => {
      const { user: shiftUser } = context;
      console.log("Shifts query called");

      if (!shiftUser?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      console.log("Input User ID:", userId, "Session user ID:", shiftUser?.sub);

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: shiftUser.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (currentUser.role !== "MANAGER") {
        // Check if the user is a manager
        if (userId !== shiftUser.sub) {
          // Check if the user is the same as the one fetching the shifts
          console.log("Current user is not the one fetching shifts");
          const error = errorResponse(403); // Return the error response
          throw new GraphQLError(error.message, {
            extensions: error.extensions,
          });
        }

        if (dateRange) {
          // Check if the date range is provided
          console.log("Date range:", typeof dateRange); // Log the date range
          const { startDate, endDate } = dateRange; // Destructure the date range
          console.log("Start date:", startDate); // Log the start date
          console.log("End date:", endDate); // Log the end date
          const shifts = await prisma.shift.findMany({
            // Get the shifts
            where: {
              userId: currentUser.id,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            orderBy: { createdAt: "desc" },
            include: { user: true },
          });

          return shifts;
        }
        const startDate = new Date(); // Set the start date
        const endDate = new Date(); // Set the end date
        endDate.setDate(startDate.getDate() - 7); // Set the end date to 7 days ago
        const shifts = await prisma.shift.findMany({
          // Get the shifts
          where: { userId: currentUser.id },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        });

        return shifts;
      }

      console.log("Current user is the one fetching shifts"); // Log the current user is the one fetching shifts

      if (dateRange) {
        // Check if the date range is provided
        const { startDate, endDate } = dateRange; // Destructure the date range
        const shifts = await prisma.shift.findMany({
          // Get the shifts
          where: {
            userId: userId,
            createdAt: { gte: startDate, lte: endDate },
          },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        });

        return shifts;
      }

      const startDate = new Date(); // Set the start date
      const endDate = new Date(); // Set the end date
      endDate.setDate(startDate.getDate() - 7); // Set the end date to 7 days ago
      const shifts = await prisma.shift.findMany({
        // Get the shifts
        where: { userId: userId, createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });

      return shifts;
    },

    allShifts: async (
      // Get all shifts by date range
      _: unknown,
      { dateRange }: { dateRange: { startDate: Date; endDate: Date } },
      context: Context
    ) => {
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (currentUser.role !== "MANAGER") {
        // Check if the user is a manager
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (dateRange) {
        // Check if the date range is provided
        const { startDate, endDate } = dateRange; // Destructure the date range
        const shifts = await prisma.shift.findMany({
          // Get the shifts
          where: {
            user: {
              role: "CARETAKER",
            },
            AND: [
              {
                clockIn: {
                  gte: startDate, // Check if the clock in date is greater than or equal to the start date
                },
              },
              {
                clockOut: {
                  lte: endDate, // Check if the clock out date is less than or equal to the end date
                },
              },
            ],
          },
          orderBy: { createdAt: "desc" }, // Order the shifts by the created at date
          include: { user: true }, // Include the user in the shifts
        });

        return shifts;
      }

      const now = new Date(); // Set the current date

      // Set startDate to the beginning of today
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );

      // Set endDate to the end of today
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      const shifts = await prisma.shift.findMany({
        // Get the shifts
        where: {
          user: {
            role: "CARETAKER",
          },
          clockIn: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });
      return shifts;
    },

    hoursPerDateRange: async (
      // Get the hours per date range
      _: unknown,
      { dateRange }: { dateRange: { startDate: Date; endDate: Date } },
      context: Context
    ) => {
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (currentUser.role !== "MANAGER") {
        // Check if the user is a manager
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const { startDate, endDate } = dateRange; // Destructure the date range
      const shifts = await prisma.shift.findMany({
        // Get the shifts
        where: {
          user: {
            role: "CARETAKER",
          },
          clockOut: {
            gte: startDate, // Check if the clock out date is greater than or equal to the start date
            lte: endDate, // Check if the clock out date is less than or equal to the end date
            not: null, // Check if the clock out date is not null
          },
        },
        orderBy: { createdAt: "desc" }, // Order the shifts by the created at date
        include: { user: true }, // Include the user in the shifts
      });

      type UserDailyTotals = {
        // Define the type for the user daily totals
        [userId: string]: {
          userName: string;
          dailyTotals: { [date: string]: number };
        };
      };

      const userDailyTotals: UserDailyTotals = {}; // Initialize the user daily totals

      shifts.forEach((shift) => {
        if (shift.clockOut) {
          // Check if the clock out date is not null
          const userId = shift.user.id; // Get the user ID
          const userName = shift.user.name; // Get the user name
          const clockOutDate = new Date(shift.clockOut); // Get the clock out date
          const dateKey = clockOutDate.toISOString().split("T")[0]; // Get the date key

          if (!userDailyTotals[userId]) {
            // Check if the user daily totals are not found
            userDailyTotals[userId] = {
              userName,
              dailyTotals: {},
            };
          }

          if (!userDailyTotals[userId].dailyTotals[dateKey]) {
            // Check if the date key is not found
            userDailyTotals[userId].dailyTotals[dateKey] = 0; // Set the date key to 0
          }

          const clockInTime = new Date(shift.clockIn).getTime(); // Get the clock in time
          const clockOutTime = clockOutDate.getTime(); // Get the clock out time
          const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Get the hours worked
          userDailyTotals[userId].dailyTotals[dateKey] += hoursWorked; // Add the hours worked to the date key
        }
      });

      const result: UserDailyHours[] = Object.entries(userDailyTotals) // Get the result
        .filter(([, { dailyTotals }]) => Object.keys(dailyTotals).length > 0) // Check if the daily totals are not empty
        .map(([userId, { userName, dailyTotals }]) => ({
          // Map the user daily totals
          userId, // Get the user ID
          userName, // Get the user name
          dailyTotals: Object.entries(dailyTotals).map(([date, hours]) => ({
            // Map the daily totals
            date, // Get the date
            hours, // Get the hours
          })),
        }));

      console.log("Result:", result); // Log the result

      return result;
    },

    hoursLast7Days: async (_: unknown, __: unknown, context: Context) => {
      // Get the hours last 7 days
      const { user: staffUser } = context;
      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 5
      );
      console.log("Start date:", startDate);
      if (!staffUser?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const currentUser = await prisma.user.findUnique({
        // Get the user by ID
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        // Check if the user is found
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const shifts = await prisma.shift.findMany({
        // Get the shifts
        where: {
          userId: currentUser.id,
          clockOut: {
            gte: startDate, // Check if the clock out date is greater than or equal to the start date
            not: null,
          },
        },
      });

      type DailyTotals = {
        // Define the type for the daily totals
        [key: string]: number; // The key is the date string (YYYY-MM-DD)
      };

      // Create an object to hold totals keyed by date string (YYYY-MM-DD)
      const dailyTotals: DailyTotals = {};
      // Initialize 7 days with 0 hours
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        const dateKey = day.toISOString().split("T")[0].split("-")[2];
        // e.g., "2025-03-10", ... "2025-03-16"
        dailyTotals[dateKey] = 0;
      }

      console.log(dailyTotals);

      // For each shift, compute the duration (in hours) and assign it to the day of clockOut
      shifts.forEach((shift) => {
        if (shift.clockOut) {
          // Check if the clock out date is not null
          const clockOutDate = new Date(shift.clockOut); // Get the clock out date
          const dateKey = clockOutDate
            .toISOString()
            .split("T")[0]
            .split("-")[2];
          console.log("Date key:", dateKey);
          if (dailyTotals.hasOwnProperty(dateKey)) {
            // Check if the date key is in the daily totals
            console.log("Shift:", shift);
            const clockInTime = new Date(shift.clockIn).getTime(); // Get the clock in time
            const clockOutTime = clockOutDate.getTime(); // Get the clock out time
            const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Get the hours worked
            console.log(dailyTotals[dateKey]); // Log the daily totals
            dailyTotals[dateKey] += hoursWorked;
          }
        }
      });

      console.log("Daily totals:", dailyTotals);

      // Convert the dailyTotals object into an array of 7 floats in ascending order (from oldest to today)
      const result = [];
      for (let i = 0; i < 7; i++) {
        // Loop through the 7 days and update each day with the hours worked
        const day = new Date(startDate); // Get the start date
        console.log("Start date:", startDate); // Log the start date
        day.setDate(startDate.getDate() + i - 1); // Set the date to the day of the week
        const dateKey = String(day.getDate()); // Get the date key
        console.log("Date key:", dateKey); // Log the date key
        result.push({
          // Add the date and hours to the result
          date: dateKey,
          hours: dailyTotals[dateKey] || 0,
        });
      }

      return result;
    },
  },

  Mutation: {
    createUser: async (
      // Create a new user
      _: unknown,
      {
        input,
      }: {
        input: {
          // The input is the user data
          email: string; // The email of the user
          name: string; // The name of the user
          role: string; // The role of the user
          auth0Id: string; // The Auth0 ID of the user
        };
      },
      context: Context
    ) => {
      const { user } = context; // Get the user from the context

      if (!user?.sub) {
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (input.auth0Id !== user.sub) {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const userRecord = await prisma.user.findUnique({
        // Get the user by ID
        where: {
          auth0Id: user.sub,
        },
      });

      if (userRecord) {
        // Check if the user is found
        return userRecord; // Return the user
      }

      const newUser = await prisma.user.create({
        // Create a new user
        data: {
          email: input.email, // The email of the user
          name: input.name, // The name of the user
          role: input.role as UserRole, // The role of the user
          auth0Id: user.sub as string, // The Auth0 ID of the user
        },
      });

      return newUser; // Return the new user
    },

    updateUserProfile: async (
      // Update the user profile
      _: unknown,
      {
        input,
      }: {
        input: {
          // The input is the user data
          name: string; // The name of the user
        };
      },
      context: Context
    ) => {
      const { user } = context; // Get the user from the context

      if (!user?.sub) {
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const updatedUser = await prisma.user.update({
        // Update the user
        where: {
          auth0Id: user.sub,
        },
        data: {
          name: input.name, // The name of the user
        },
      });

      return updatedUser; // Return the updated user
    },

    createLocation: async (
      // Create a new location
      _: unknown,
      {
        input,
      }: {
        input: {
          // The input is the location data
          name: string; // The name of the location
          latitude: number; // The latitude of the location
          longitude: number; // The longitude of the location
          radius: number; // The radius of the location
        };
      },
      context: Context
    ) => {
      const { user } = context; // Get the user from the context

      if (!user?.sub) {
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (userRecord.role !== "MANAGER") {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      // Check if a location already exists
      const existingLocation = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (existingLocation) {
        const error = errorResponse(409); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const location = await prisma.location.create({
        data: {
          name: input.name, // The name of the location
          latitude: input.latitude, // The latitude of the location
          longitude: input.longitude, // The longitude of the location
          radius: input.radius, // The radius of the location
        },
      });

      return location; // Return the location
    },

    updateLocation: async (
      // Update the location
      _: unknown,
      {
        input,
      }: {
        input: {
          // The input is the location data
          name: string; // The name of the location
          latitude: number; // The latitude of the location
          longitude: number; // The longitude of the location
          radius: number; // The radius of the location
        };
      },
      context: Context
    ) => {
      const { user } = context; // Get the user from the context

      if (!user?.sub) {
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (userRecord.role !== "MANAGER") {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      // Check if a location already exists
      const existingLocation = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (!existingLocation) {
        const location = await prisma.location.create({
          // Create a new location
          data: {
            name: input.name, // The name of the location
            latitude: input.latitude, // The latitude of the location
            longitude: input.longitude, // The longitude of the location
            radius: input.radius, // The radius of the location
          },
        });

        return location; // Return the location
      }

      const location = await prisma.location.update({
        // Update the location
        where: {
          id: existingLocation.id,
        },
        data: {
          name: input.name, // The name of the location
          latitude: input.latitude, // The latitude of the location
          longitude: input.longitude, // The longitude of the location
          radius: input.radius, // The radius of the location
        },
      });

      return location; // Return the location
    },

    clockIn: async (
      // Clock in
      _: unknown,
      {
        input,
      }: {
        input: {
          // The input is the clock in data
          note: string; // The note of the clock in
        };
      },
      context: Context
    ) => {
      const { user } = context; // Get the user from the context

      if (!user?.sub) {
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (userRecord.role === "MANAGER") {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const location = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (!location) {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const existingShift = await prisma.shift.findFirst({
        where: {
          userId: userRecord.id,
          clockOut: null,
        },
      });

      if (existingShift) {
        const error = errorResponse(409); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const newShift = await prisma.shift.create({
        // Create a new shift
        data: {
          clockIn: new Date(), // The clock in date
          clockInNote: input.note, // The note of the clock in
          user: {
            connect: {
              id: userRecord.id,
            },
          },
        },
        include: {
          user: true,
        },
      });

      return newShift; // Return the new shift
    },

    clockOut: async (
      // Clock out
      _: unknown,
      {
        input,
      }: {
        input: { id: string; note: string }; // The input is the clock out data
      },
      context: Context
    ) => {
      console.log("Clock out mutation called", input);
      const { user } = context;
      if (!user?.sub) {
        // Check if the user is authenticated
        const error = errorResponse(401); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      if (userRecord.role === "MANAGER") {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      const location = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (!location) {
        const error = errorResponse(403); // Return the error response
        throw new GraphQLError(error.message, { extensions: error.extensions }); // Throw the error
      }

      console.log("Input ID:", input.id);

      const existingShift = await prisma.shift.findFirst({
        // Find the existing shift
        where: {
          id: input.id,
        },
        include: {
          user: true,
        },
      });

      if (!existingShift) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (existingShift.clockOut) {
        // Check if the shift has already been clocked out
        return existingShift; // Return the existing shift
      }

      const updatedShift = await prisma.shift.update({
        // Update the shift
        where: {
          id: input.id,
        },
        data: {
          clockOut: new Date(), // The clock out date
          clockOutNote: input.note, // The note of the clock out
        },
        include: {
          user: true,
        },
      });

      return updatedShift; // Return the updated shift
    },
  },
};
