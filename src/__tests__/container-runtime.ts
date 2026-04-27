import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dockerSocket = '/var/run/docker.sock';

function hasPodmanSocket(): boolean {
	const runtimeDir = process.env.XDG_RUNTIME_DIR;
	return runtimeDir
		? existsSync(join(runtimeDir, 'podman', 'podman.sock'))
		: false;
}

export function hasContainerRuntime(): boolean {
	return Boolean(
		process.env.DOCKER_HOST ||
			existsSync(dockerSocket) ||
			hasPodmanSocket(),
	);
}
