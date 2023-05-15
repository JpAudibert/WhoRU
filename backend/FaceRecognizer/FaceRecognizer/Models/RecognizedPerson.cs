namespace FaceRecognizer.Models;

public class RecognizedPerson
{
    public string Name { get; set; }

    public RecognizedPerson(string name)
    {
        Name = name;
    }
}
