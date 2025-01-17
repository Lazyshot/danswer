"use client";

import * as Yup from "yup";
import { TrashIcon, ZendeskIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  ZendeskCredentialJson,
  ZendeskConfig,
  ConnectorIndexingStatus,
  Credential,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";

const Main = () => {
  const { popup, setPopup } = usePopup();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const zendeskConnectorIndexingStatuses: ConnectorIndexingStatus<
    ZendeskConfig,
    ZendeskCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "zendesk"
  );
  const zendeskCredential: Credential<ZendeskCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.zendesk_email
    );

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your API details
      </h2>

      {zendeskCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing API Token: </p>
            <p className="ml-1 italic my-auto max-w-md">
              {zendeskCredential.credential_json?.zendesk_email}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (zendeskConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(zendeskCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To get started you&apos;ll need API token details for your Zendesk
            instance. You can generate this by access the Admin Center of your instance
            (e.g. https://&lt;subdomain&gt;.zendesk.com/admin/). Proceed to the "Apps and
            Integrations" section and "Zendesk API" page. Add a new API token and provide
            it with a name. You will also need to provide the e-mail address of a user that
            the system will impersonate. This is of little consequence as we are only performing
            read actions.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2 mb-4">
            <CredentialForm<ZendeskCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="zendesk_subdomain"
                    label="Zendesk Subdomain (<subdomain>.zendesk.com):"
                  />
                  <TextFormField
                    name="zendesk_email"
                    label="Zendesk User Email:"
                  />
                  <TextFormField
                    name="zendesk_token"
                    label="Zendesk API Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                zendesk_subdomain: Yup.string().required(
                  "Please enter the subdomain for your Zendesk instance"
                ),
                zendesk_email: Yup.string().required(
                  "Please enter your user email to user with the token"
                ),
                zendesk_token: Yup.string().required(
                  "Please enter your Zendesk API token"
                ),
              })}
              initialValues={{
                zendesk_subdomain: "",
                zendesk_email: "",
                zendesk_token: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  refreshCredentials();
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      {zendeskConnectorIndexingStatuses.length > 0 && (
        <>
          <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
            Zendesk indexing status
          </h2>
          <p className="text-sm mb-2">
            The latest article changes are fetched every 10 minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable<ZendeskConfig, ZendeskCredentialJson>
              connectorIndexingStatuses={zendeskConnectorIndexingStatuses}
              liveCredential={zendeskCredential}
              getCredential={(credential) => {
                return (
                  <div>
                    <p>{credential.credential_json.zendesk_email}</p>
                  </div>
                );
              }}
              onCredentialLink={async (connectorId) => {
                if (zendeskCredential) {
                  await linkCredential(connectorId, zendeskCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
        </>
      )}

      {zendeskCredential &&
        zendeskConnectorIndexingStatuses.length === 0 && (
          <>
            <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
              <h2 className="font-bold mb-3">Create Connection</h2>
              <p className="text-sm mb-4">
                Press connect below to start the connection to your Zendesk
                instance.
              </p>
              <ConnectorForm<ZendeskConfig>
                nameBuilder={(values) => `ZendeskConnector`}
                ccPairNameBuilder={(values) => `ZendeskConnector`}
                source="zendesk"
                inputType="poll"
                formBody={<></>}
                validationSchema={Yup.object().shape({})}
                initialValues={{}}
                refreshFreq={10 * 60} // 10 minutes
                credentialId={zendeskCredential.id}
              />
            </div>
          </>
        )}

      {!zendeskCredential && (
        <>
          <p className="text-sm mb-4">
            Please provide your API details in Step 1 first! Once done with
            that, you&apos;ll be able to start the connection then see indexing
            status.
          </p>
        </>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <ZendeskIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Zendesk</h1>
      </div>
      <Main />
    </div>
  );
}
