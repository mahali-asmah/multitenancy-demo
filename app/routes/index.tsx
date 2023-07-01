import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { Site } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";

const DEFAULT_DOMAIN = process.env.DOMAIN || "mydomain.io";
const LOCALHOST = "localhost:3000";

function getHost(request: Request): string {
  let host = request.headers.get("host");
  if (!host) throw new Error("Missing host");

  // Replace localhost with the default domain
  if (host.includes("localhost")) {
    host = host.replace(/localhost:\d+/, DEFAULT_DOMAIN);
  }

  // Strip the domain if the host is a subdomain
  if (host.endsWith(`.${DEFAULT_DOMAIN}`)) {
    host = host.replace(`.${DEFAULT_DOMAIN}`, "");
  }

  return host;
}

async function retrieveSiteFromDatabase(host: string) {
  return await prisma.site.findUnique({
    where: {
      slug: host,
    },
  });
}

function getIsSubdomain(host: string): boolean {
  return ![LOCALHOST, DEFAULT_DOMAIN].includes(host);
}

export const loader: LoaderFunction = async ({ request }) => {
  let host = getHost(request);

  const isSubdomain = getIsSubdomain(host);

  const currentSite = isSubdomain ? await retrieveSiteFromDatabase(host) : null;

  if (isSubdomain && new URL(request.url).pathname !== "/") {
    return redirect(`//${host}`, { status: 302 });
  }

  // Throw a 404 error if the host is a subdomain and no site was found
  if (!currentSite && isSubdomain) {
    throw new Response("Not found", { status: 404 });
  }

  // Return the data to be consumed by the page component
  return json({
    domain: DEFAULT_DOMAIN,
    isSubdomain,
    currentSite,
  });
};

const LandingPage = () => (
  <div className="w-full h-screen flex flex-col items-center space-y-4 justify-center">
    <h1 className="font-bold text-3xl">Welcome to MyDomain</h1>
    <p className="text-gray-600 max-w-md text-center">
      This is the my domain landing page
    </p>
  </div>
);

export default function Index() {
  const { domain, isSubdomain, currentSite } = useLoaderData<typeof loader>();

  return isSubdomain ? (
    <SubdomainPage site={currentSite} domain={domain} />
  ) : (
    <LandingPage />
  );
}

const SubdomainPage: React.FC<{ site: Site; domain: string }> = ({
  site,
  domain,
}) => (
  <div className="w-full h-screen flex flex-col items-center space-y-4 justify-center">
    <h1 className="font-bold text-3xl">{site?.name}</h1>
    <p className="text-gray-600 max-w-md text-center">{site?.description}</p>
    <p className="text-gray-600 max-w-md text-center">{domain}</p>

    <p className="text-xs text-gray-500">Your custom subdomain</p>
  </div>
);
