const x = "/x";

export const path = {
  to: {
    ballooningDiagram: (id: string) => `${x}/ballooning-diagram/${id}`,
    ballooningDiagrams: `${x}/quality/ballooning`,
    deleteBallooningDiagram: (id: string) =>
      `${x}/ballooning-diagram/delete/${id}`,
    newBallooningDiagram: `${x}/quality/ballooning/new`,
    uploadPdf: `${x}/api/upload-pdf`
  }
};
