export class CreateDonorDto {
    user: string;
    bloodType: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  }
  