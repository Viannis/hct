import { gql } from "@apollo/client";

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      role
      auth0Id
    }
  }
`;

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
    updateUserProfile(input: $input) {
      id
      name
      email
      role
      auth0Id
    }
  }
`;

export const CREATE_LOCATION = gql`
  mutation CreateLocation($input: LocationInput!) {
    createLocation(input: $input) {
      id
      name
      latitude
      longitude
      radius
    }
  }
`;

export const UPDATE_LOCATION = gql`
  mutation UpdateLocation($input: LocationInput!) {
    updateLocation(input: $input) {
      id
      name
      latitude
      longitude
      radius
    }
  }
`;

export const CLOCK_IN = gql`
  mutation ClockIn($input: ClockInInput) {
    clockIn(input: $input) {
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

export const CLOCK_OUT = gql`
  mutation ClockOut($input: ClockOutInput) {
    clockOut(input: $input) {
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
