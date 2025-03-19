# Healthcare Worker Shift Management Application

Live Demo Link: [https://hct-ten.vercel.app/]

## Introduction

This application is designed for healthcare organizations to manage and track the shifts of their care workers. It allows managers to set location perimeters for clocking in and provides care workers with the ability to clock in and out of their shifts.

## User Roles and Features

### Manager

- **Set Location Perimeter**: Define a location perimeter (e.g., within specified km radius) where care workers can clock in.
- **View Staff Table**: Access a table of all staff who are clocked in, including details of when they clocked in and out.
- **Dashboard**: View a dashboard displaying:
  - Average hours spent clocked in today (Can be modified for date range).
  - View active and current ongoing shifts for today (Can be modified for date range)
  - Compare hours per day amongst care workers in date range.

### Care Worker (Caretaker)

- **Clock In/Out**: Clock in when entering the defined perimeter and clock out when already clocked in. Optional notes can be provided.
- **Location Restriction**: Receive notifications if attempting to clock in outside the perimeter.

## Actions
- **Update Location**: Signup as a Manager => dashboard/settings/location => click update => search for new location (suggestions allowed for US, UK and IND), change radius if needed => save
- **Clock in & out**: If the location set form the manager role is in nearest proximity, then by allowing location permission, you will be able to clockin. If already clocked in, you will be able to clockout.

## Technologies Used

- **Frontend**:

  - **Next.js**: Framework for building the web application.
  - **Ant Design**: UI components.
  - **Chart.js**: Data visualization in the manager's dashboard.

- **Backend**:

  - **GraphQL**: API queries and mutations.
  - **Prisma**: ORM for database connectivity.

- **Authentication**:

  - **Auth0**: User authentication and authorization.

- **Database**:

  - **Prisma Client**: Interacts with the postgres database (Neon Postgres for serverless cloud postgres).

- **Hosting**:
  - **Vercel**:

## Data Flow

- **User Authentication**: Managed by Auth0, ensuring secure login and role-based access control.
- **Data Fetching**: GraphQL queries fetch data such as user details, shifts, and location settings.
- **Role-Based Access**: Checks user roles to determine access to specific features and data.
- **Shift Management**: Care workers' shifts are recorded and managed through GraphQL mutations.

## What Has Been Implemented

- **Authentication**: Username-password and google login authentication including post registration checks for disallowing duplicate account creation across login methods. (Users won't be allowed to signup with the same email used with the other login method.)
- **Role-based Authentication**: Manager and Caretaker are the two roles and upon login, the will be authorized to only go to their respective dashboards. Middleware is responsible for verifying the path and authorizing the request.
- **Session and JWT based authorization for API calls and requests**: Every request made by the user from the client end is autorized by app session stored in cookies (provided by Auth0.) Every server-side requests is validated by API accesstoken and session ID token for graphQL queries. ID tokens are validated by JWT.veriy()

- **Location suggestion for managers**: With Places API from google, place address will be suggested as the manager types in the input field.
- **Clock in baed on location range**: Caretakers will be asked for their current location permission and based on their location in coparison with the location range set by the manager, will be allowed to clockIn.
- **View & filter shifts by date range**: Caretakers upon sucessful clock in can view the record being reflected in the table (Apollo cache) reflecting their details. Basic date range filter has been set for view more past records. For easy of viewing, clock in and out notes has been truncated and the full details can be viewed in a modal.
- **Stats and visualisation**: Caretakers can view their average and total hours worked in their last week with line chart showing the trend of hours based on the date range selected for the table.
- **Update Name**: A simple update name has been implemented.

- **View active and completed shifts**: Manager in their dashboard can get an overview of active and completed shifts for the date range.
- **Preview & export table data for selected date ranage**: Manager can preview and export the current table as either pdf or csv. The preview has been set for first page alone.
- **Visualisation for comparing careworker hours in date range**: Multiline chart refelecting each careworker's shift hours per day across time range.
- **View all careworkers and their shifts**: Manager can view all the carworker details and their shifts.
- **Update location**: Manager can update the existing location. No more than one location can be there even if multiple managers are present.

## Folder Structure

- **src/app**: Contains all the app router pages including Landing page "/", Onboarding "/onboarding", Manager dashboard "dashboard/manager", Caretaker dashboard "dashboard/caretaker".
  - **Home Page**: Renders Login/Go to Dashboard/Complete Account Setup options based on session and user details in the db.
  - **Onboarding**: Checks if user has onboarded already and if not, asks for a name and role to onboard the user. Upon form submit, user profile is created in the DB and role will be updated in Auth0.
  - **Manager Dashboard**: If location not set, prompts to set new location in the home page by default and upon setting a new location and radius for range, caretakers on the other end will be allowed to clockin. With populated caretaker data, charts and stats can be seen.
  - **Caretaker Dashboard**: Can clockin if in range. For testing, create a Manger role account and update the location to the nearest of your current location by seraching from the search input, and try clocking in from a caretaker account with current location.
- **src/app/api**: Server side routes
  - **api/auth**: api/auth/[auth0]/route for handling login/logout/me and other callbacks provided by Auth0.
  - **api/assign-role-name**: For creating user in the db and updating the Auth0 end with the role for RBAC
  - **api/get-access-token**: For ApolloClient to get access-token. Currently uses POSt method for not exposing the token. However, could use user session token itself from getSession
  - **api/get-loggedin-user-roles**: For fetching users details from the DB, running a sync check to update Auth0 roles in the case of error previously. Used by "/" and "/onboarding" routes to redirect the user to either the onboarding or the dashboard. If not fecthing from DB, this would have been handled in the middleware itself.
  - **api/get-user-roles**: For fetching all the user roles that has been defined in the Auth0 end. This is used by the onboading page to display the dropdowns. It is a overkill for the current application, but a recommended approach for scalable apps.
  - **api/services**: Contains resuable api end functions including updating user roles in Auth0, fetching current user from DB, verifying token, creating a user in the DB, fetch API only access token from Auth0, etc.,
- **graphQL endpoint**: Server side routes
  - **schema**: Defines the query and mutation schema for the grpahQL to understand the data relations.
  - **route**: Apolloserver initialting the server for graphQL and resolving authorization before a requiest is made to the resolver. Req to this api route is verified either by the user's session or by authorization token from in the req headers by validating the jwt. The user claims is then passed via context to the resolver.
  - **resolver**: Handles query and mutation operations.
- **src/middleware**: Handles authorization before satisfying route requests.
- **src/components**: Contains global components including ApolloProvider.
- **src/utils**: Contains both client and server end utilites including ApolloClient for grpahQL queries, auth0 setup, mutations and queries

- **Visualisation for comparing careworker hours in date range**: Multiline chart refelecting each careworker's shift hours per day across time range.
- **View all careworkers and their shifts**: Manager can view all the carworker details and their shifts.
- **Update location**: Manager can update the existing location. No more than one location can be there even if multiple managers are present.

## App Screenshots
**Manager Dashboard**

![Image](https://github.com/user-attachments/assets/96676fff-7200-475e-bf19-7729f9917133)

**Caretaker Dashboard**

![Image](https://github.com/user-attachments/assets/e0fcb0b6-44d8-4265-bb3e-aee874315826)

**Caretakers (Manager Dashboard)**

![Image](https://github.com/user-attachments/assets/5235fd10-7b56-439f-8440-1c46d5e31f2b)

**Location Settings (Manager Dashboard)**

![Image](https://github.com/user-attachments/assets/2ab55988-e41b-470b-8da3-7096b58343d6)

## Setup and Installation

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Run the development server with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Deploy the application using platforms like Vercel, Netlify, or Heroku. Follow the platform-specific instructions for deployment.

## Contributing

Contributions are welcome. Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
