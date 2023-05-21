namespace FaceRecognizer.Models;

public class RecognizedPerson
{
    public bool IsRecognized { get; set; }
    public string? Name { get; set; } = string.Empty;

    public RecognizedPerson(bool isRecognized)
    {
        IsRecognized = isRecognized;
    }
}
