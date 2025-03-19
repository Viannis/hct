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
      _: unknown,
      { userId }: { userId: string },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: user.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (currentUser.role !== "MANAGER") {
        if (userId !== user.sub) {
          const error = errorResponse(403);
          throw new GraphQLError(error.message, {
            extensions: error.extensions,
          });
        }
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      return userRecord;
    },

    location: async (_: unknown, __: unknown, context: Context) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const location = await prisma.location.findFirst();

      return location;
    },

    caretakers: async (_: unknown, __: unknown, context: Context) => {
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (currentUser.role !== "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const caretakers = await prisma.user.findMany({
        where: { role: "CARETAKER" },
        include: {
          shifts: {
            orderBy: { clockIn: "desc" },
            take: 1,
          },
        },
      });

      return caretakers.map((caretaker) => ({
        id: caretaker.id,
        name: caretaker.name,
        email: caretaker.email,
        lastClockedIn: caretaker.shifts[0]?.clockIn || null,
        lastClockedOut: caretaker.shifts[0]?.clockOut || null,
      }));
    },

    caretakerShifts: async (
      _: unknown,
      { userId }: { userId: string },
      context: Context
    ) => {
      console.log("Caretaker shifts query called");
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (currentUser.role !== "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const caretakerShifts = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          shifts: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!caretakerShifts) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      console.log("Caretaker shifts:", caretakerShifts);

      return {
        id: caretakerShifts.id,
        name: caretakerShifts.name,
        email: caretakerShifts.email,
        shifts: caretakerShifts.shifts || [],
      };
    },

    shifts: async (
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
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      console.log("Input User ID:", userId, "Session user ID:", shiftUser?.sub);

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: shiftUser.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (currentUser.role !== "MANAGER") {
        if (userId !== shiftUser.sub) {
          console.log("Current user is not the one fetching shifts");
          const error = errorResponse(403);
          throw new GraphQLError(error.message, {
            extensions: error.extensions,
          });
        }

        if (dateRange) {
          console.log("Date range:", typeof dateRange);
          const { startDate, endDate } = dateRange;
          console.log("Start date:", startDate);
          console.log("End date:", endDate);
          const shifts = await prisma.shift.findMany({
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
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() - 7);
        const shifts = await prisma.shift.findMany({
          where: { userId: currentUser.id },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        });

        return shifts;
      }

      console.log("Current user is the one fetching shifts");

      if (dateRange) {
        const { startDate, endDate } = dateRange;
        const shifts = await prisma.shift.findMany({
          where: {
            userId: userId,
            createdAt: { gte: startDate, lte: endDate },
          },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        });

        return shifts;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() - 7);
      const shifts = await prisma.shift.findMany({
        where: { userId: userId, createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });

      return shifts;
    },

    allShifts: async (
      _: unknown,
      { dateRange }: { dateRange: { startDate: Date; endDate: Date } },
      context: Context
    ) => {
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (currentUser.role !== "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (dateRange) {
        const { startDate, endDate } = dateRange;
        const shifts = await prisma.shift.findMany({
          where: {
            user: {
              role: "CARETAKER",
            },
            AND: [
              {
                clockIn: {
                  gte: startDate,
                },
              },
              {
                clockOut: {
                  lte: endDate,
                },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        });

        return shifts;
      }

      const now = new Date();

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
      _: unknown,
      { dateRange }: { dateRange: { startDate: Date; endDate: Date } },
      context: Context
    ) => {
      const { user: staffUser } = context;

      if (!staffUser?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (currentUser.role !== "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const { startDate, endDate } = dateRange;
      const shifts = await prisma.shift.findMany({
        where: {
          user: {
            role: "CARETAKER",
          },
          clockOut: {
            gte: startDate,
            lte: endDate,
            not: null,
          },
        },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      });

      type UserDailyTotals = {
        [userId: string]: {
          userName: string;
          dailyTotals: { [date: string]: number };
        };
      };

      const userDailyTotals: UserDailyTotals = {};

      shifts.forEach((shift) => {
        if (shift.clockOut) {
          const userId = shift.user.id;
          const userName = shift.user.name;
          const clockOutDate = new Date(shift.clockOut);
          const dateKey = clockOutDate.toISOString().split("T")[0];

          if (!userDailyTotals[userId]) {
            userDailyTotals[userId] = {
              userName,
              dailyTotals: {},
            };
          }

          if (!userDailyTotals[userId].dailyTotals[dateKey]) {
            userDailyTotals[userId].dailyTotals[dateKey] = 0;
          }

          const clockInTime = new Date(shift.clockIn).getTime();
          const clockOutTime = clockOutDate.getTime();
          const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
          userDailyTotals[userId].dailyTotals[dateKey] += hoursWorked;
        }
      });

      const result: UserDailyHours[] = Object.entries(userDailyTotals)
        .filter(([, { dailyTotals }]) => Object.keys(dailyTotals).length > 0)
        .map(([userId, { userName, dailyTotals }]) => ({
          userId,
          userName,
          dailyTotals: Object.entries(dailyTotals).map(([date, hours]) => ({
            date,
            hours,
          })),
        }));

      console.log("Result:", result); // Debugging line to check the result

      return result;
    },

    hoursLast7Days: async (_: unknown, __: unknown, context: Context) => {
      const { user: staffUser } = context;
      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 5
      );
      console.log("Start date:", startDate);
      if (!staffUser?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const currentUser = await prisma.user.findUnique({
        where: { auth0Id: staffUser.sub },
      });

      if (!currentUser) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      // Fetch shifts for the user where clockOut is not null and occurred on or after startDate
      const shifts = await prisma.shift.findMany({
        where: {
          userId: currentUser.id,
          clockOut: {
            gte: startDate,
            not: null,
          },
        },
      });

      type DailyTotals = {
        [key: string]: number;
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
          const clockOutDate = new Date(shift.clockOut);
          const dateKey = clockOutDate
            .toISOString()
            .split("T")[0]
            .split("-")[2];
          console.log("Date key:", dateKey);
          if (dailyTotals.hasOwnProperty(dateKey)) {
            console.log("Shift:", shift);
            const clockInTime = new Date(shift.clockIn).getTime();
            const clockOutTime = clockOutDate.getTime();
            const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
            console.log(dailyTotals[dateKey]);
            dailyTotals[dateKey] += hoursWorked;
          }
        }
      });

      console.log("Daily totals:", dailyTotals);

      // Convert the dailyTotals object into an array of 7 floats in ascending order (from oldest to today)
      const result = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        console.log("Start date:", startDate);
        day.setDate(startDate.getDate() + i - 1);
        const dateKey = String(day.getDate());
        console.log("Date key:", dateKey);
        result.push({
          date: dateKey,
          hours: dailyTotals[dateKey] || 0,
        });
      }

      return result;
    },
  },

  Mutation: {
    createUser: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          email: string;
          name: string;
          role: string;
          auth0Id: string;
        };
      },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (input.auth0Id !== user.sub) {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (userRecord) {
        return userRecord;
      }

      const newUser = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role as UserRole,
          auth0Id: user.sub as string,
        },
      });

      return newUser;
    },

    updateUserProfile: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
        };
      },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const updatedUser = await prisma.user.update({
        where: {
          auth0Id: user.sub,
        },
        data: {
          name: input.name,
        },
      });

      return updatedUser;
    },

    createLocation: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          latitude: number;
          longitude: number;
          radius: number;
        };
      },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (userRecord.role !== "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      // Check if a location already exists
      const existingLocation = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (existingLocation) {
        const error = errorResponse(409);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const location = await prisma.location.create({
        data: {
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          radius: input.radius,
        },
      });

      return location;
    },

    updateLocation: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          latitude: number;
          longitude: number;
          radius: number;
        };
      },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (userRecord.role !== "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      // Check if a location already exists
      const existingLocation = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (!existingLocation) {
        const location = await prisma.location.create({
          data: {
            name: input.name,
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
          },
        });

        return location;
      }

      const location = await prisma.location.update({
        where: {
          id: existingLocation.id,
        },
        data: {
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          radius: input.radius,
        },
      });

      return location;
    },

    clockIn: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          note: string;
        };
      },
      context: Context
    ) => {
      const { user } = context;

      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (userRecord.role === "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const location = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (!location) {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const existingShift = await prisma.shift.findFirst({
        where: {
          userId: userRecord.id,
          clockOut: null,
        },
      });

      if (existingShift) {
        const error = errorResponse(409);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const newShift = await prisma.shift.create({
        data: {
          clockIn: new Date(),
          clockInNote: input.note,
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

      return newShift;
    },

    clockOut: async (
      _: unknown,
      {
        input,
      }: {
        input: { id: string; note: string };
      },
      context: Context
    ) => {
      console.log("Clock out mutation called", input);
      const { user } = context;
      if (!user?.sub) {
        const error = errorResponse(401);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const userRecord = await prisma.user.findUnique({
        where: {
          auth0Id: user.sub,
        },
      });

      if (!userRecord) {
        const error = errorResponse(404);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      if (userRecord.role === "MANAGER") {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      const location = await prisma.location.findUnique({
        where: {
          id: "singleton",
        },
      });

      if (!location) {
        const error = errorResponse(403);
        throw new GraphQLError(error.message, { extensions: error.extensions });
      }

      console.log("Input ID:", input.id);

      const existingShift = await prisma.shift.findFirst({
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
        return existingShift;
      }

      const updatedShift = await prisma.shift.update({
        where: {
          id: input.id,
        },
        data: {
          clockOut: new Date(),
          clockOutNote: input.note,
        },
        include: {
          user: true,
        },
      });

      return updatedShift;
    },
  },
};
