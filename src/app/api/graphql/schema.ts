import { gql } from "graphql-tag";

// Define your GraphQL schema
const typeDefs = gql`
  enum UserRole {
    MANAGER
    CARETAKER
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    auth0Id: String!
    shifts: [Shift!]
  }

  type Location {
    id: ID!
    name: String!
    latitude: Float!
    longitude: Float!
    radius: Float!
  }

  type Shift {
    id: ID!
    clockIn: DateTime!
    clockOut: DateTime
    clockInNote: String
    clockOutNote: String
    user: User!
    locationName: String
  }

  type DailyAverage {
    date: String!
    avgHours: Float!
    totalStaff: Int!
  }

  type DailyHours {
    date: String!
    hours: Float!
  }

  type UserDailyHours {
    userName: String!
    dailyTotals: [DailyHours]
  }

  type CareTaker {
    id: ID!
    name: String!
    email: String!
    lastClockedIn: DateTime
    lastClockedOut: DateTime
  }

  type CareTakerHoursShifts {
    id: ID!
    name: String!
    shifts: Int!
    hours: Float!
  }

  input DateRangeInput {
    startDate: DateTime!
    endDate: DateTime!
  }

  type Query {
    me: User
    user(userId: ID): User
    location: Location
    caretakers: [CareTaker!]
    caretakerShifts(userId: ID): User!
    shifts(userId: ID, dateRange: DateRangeInput): [Shift!]
    allShifts(dateRange: DateRangeInput): [Shift!]
    careTakerHoursShifts(dateRange: DateRangeInput): [CareTakerHoursShifts!]
    hoursLast7Days: [DailyHours!]!
    hoursPerDateRange(dateRange: DateRangeInput): [UserDailyHours!]!
  }

  input CreateUserInput {
    email: String!
    name: String!
    role: UserRole!
    auth0Id: String!
  }

  input LocationInput {
    name: String!
    latitude: Float!
    longitude: Float!
    radius: Float!
  }

  input UpdateUserProfileInput {
    name: String!
  }

  input ClockInInput {
    note: String
    locationName: String
  }

  input ClockOutInput {
    id: ID!
    note: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    deleteUser(id: ID!): Boolean
    updateUserProfile(input: UpdateUserProfileInput!): User!

    createLocation(input: LocationInput!): Location!
    updateLocation(input: LocationInput!): Location!

    clockIn(input: ClockInInput): Shift!
    clockOut(input: ClockOutInput): Shift!
  }
  

  scalar DateTime
`;

export default typeDefs;
