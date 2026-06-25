import {createContext, type ReactNode, useContext} from 'react';

// A map of participant display name → signed-in Google photo URL. Provided once
// at the app root so every Avatar can show a logged-in user's photo by name,
// without each call site having to thread the photo through as a prop.
const PhotosContext = createContext<Record<string, string>>({});

export function PhotosProvider({
	children,
	photos,
}: {
	children: ReactNode;
	photos: Record<string, string>;
}) {
	return (
		<PhotosContext.Provider value={photos}>
			{children}
		</PhotosContext.Provider>
	);
}

export function usePhotos(): Record<string, string> {
	return useContext(PhotosContext);
}
