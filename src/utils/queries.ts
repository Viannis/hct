import { gql } from "@apollo/client";

// List of GraphQL queries

export const GET_USER = gql`
  query GetUser($userId: ID!) {
    user(userId: $userId) {
      id
      name
      email
      role
      auth0Id
      shifts {
        id
        clockIn
        clockOut
        clockInNote
        clockOutNote
      }
    }
  }
`;

export const GET_LOCATION = gql`
  query GetLocation {
    location {
      id
      name
      latitude
      longitude
      radius
    }
  }
`;

export const GET_CARETAKERS = gql`
  query GetCaretakers {
    caretakers {
      id
      name
      email
      lastClockedIn
      lastClockedOut
    }
  }
`;

export const GET_CARETAKER_SHIFTS = gql`
  query GetCaretakerShifts($userId: ID!) {
    caretakerShifts(userId: $userId) {
      id
      name
      email
      shifts {
        id
        clockIn
        clockOut
        clockInNote
        clockOutNote
      }
    }
  }
`;

export const GET_SHIFTS = gql`
  query GetShifts($userId: ID!, $dateRange: DateRangeInput) {
    shifts(userId: $userId, dateRange: $dateRange) {
      id
      clockIn
      clockOut
      clockInNote
      clockOutNote
      user {
        id
        name
      }
    }
  }
`;

export const GET_ALL_SHIFTS = gql`
  query GetAllShifts($dateRange: DateRangeInput) {
    allShifts(dateRange: $dateRange) {
      id
      clockIn
      clockOut
      clockInNote
      clockOutNote
      user {
        id
        name
      }
    }
  }
`;

export const GET_HOURS_PER_DATE_RANGE = gql`
  query GetHoursPerDateRange($dateRange: DateRangeInput) {
    hoursPerDateRange(dateRange: $dateRange) {
      userName
      dailyTotals {
        date
        hours
      }
    }
  }
`;

export const GET_HOURS_LAST_7_DAYS = gql`
  query GetHoursLast7Days {
    hoursLast7Days {
      date
      hours
    }
  }
`;

export const GET_CLOCKED_IN_STAFFS = gql`
  query GetClockedInStaffs {
    clockedInStaffs {
      id
      name
      email
      role
      auth0Id
    }
  }
`;

export const GET_STAFF_STATS = gql`
  query GetStaffStats {
    staffStats {
      avgHoursPerDay
      peopleClockingIn
      totalHoursLastWeek
      dailyAverages {
        date
        avgHours
        totalStaff
      }
    }
  }
`;
